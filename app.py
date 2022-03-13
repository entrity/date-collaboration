from flask import Flask, request, render_template, make_response, send_from_directory, redirect
import sqlite3, datetime

app = Flask(__name__)

DB_FILE = '/var/www/reunion/calendar-votes.db'
DATE_FMT = '%a %b %d %Y'

# Run each query in separate session b/c different requests can't share db
# objects, and there should be only one command per request.
def db_exec(cmd, args=()):
	conn = sqlite3.connect(DB_FILE)
	cur = conn.cursor()
	cur.execute(cmd, args)
	conn.commit()
	conn.close()

# Set up db
db_exec('''
				CREATE TABLE IF NOT EXISTS votes
				(date date, user text, value int, PRIMARY KEY (date, user))
				''')

def upsert_votes(whoami, votes):
	stmt = ('''
		INSERT INTO votes (date, user, value)
		VALUES (?, ?, ?)
		ON CONFLICT(date, user) DO UPDATE SET value = ?
		WHERE date = ? AND user = ?''')
	for date_str in votes:
		date = datetime.datetime.strptime(date_str, DATE_FMT)
		value = votes[date_str]
		db_exec(stmt, (date, whoami, value, value, date, whoami))

def select_votes():
	conn = sqlite3.connect(DB_FILE)
	cur = conn.cursor()
	str2str = lambda d: datetime.datetime.strptime(d, '%Y-%m-%d 00:00:00').strftime(DATE_FMT)
	out = [{
		'date': str2str(v[0]), 'user': v[1], 'value': v[2]		
	} for v in cur.execute('SELECT date, user, value FROM votes')]
	conn.close()
	return out

@app.route("/")
def html():
	whoami = request.cookies.get('whoami') or request.args.get('whoami')
	if whoami is None:
		return redirect('/login.html')
	else:
		resp = make_response(render_template('main.html'))
		resp.set_cookie('whoami', whoami.lower())
		return resp

@app.route("/login.html")
def login_html():
	return send_from_directory('.', 'login.html')

@app.route("/main.js")
def js():
	return send_from_directory('.', 'main.js')

@app.route("/main.css")
def css():
	return send_from_directory('.', 'main.css')

@app.route("/cast-votes.json", methods=['POST'])
def cast_votes():
	whoami = request.cookies.get('whoami')
	if whoami is None:
		return ({'error': 'Not authorized'}, 401)
	upsert_votes(whoami, request.json['votes'])
	return { 'success': True }

@app.route("/votes.json")
def get_votes():
	return {
		'whoami': request.cookies.get('whoami'),
		'votes': select_votes(),
	}
