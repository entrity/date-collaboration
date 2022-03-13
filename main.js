const FIRST = new Date(2022, 6, 1);
const LAST = new Date(2022, 8, 31);
const YEAR = 2022;
const AYE = 1;
const NAY = 2;

const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const stateClasses = ['state-none', 'state-upvote', 'state-downvote'];

let dateString2UserCell = {}; // dateString => td
let dateString2VoteCell = {}; // dateString => td

let whoami;
let nVoters = 1;

let currentUserVotes = {}; // dateString => {0|1|2}
let ayeVotes = {}; // dateString => [user1, user2, ...]
let nayVotes = {}; // dateString => [user1, user2, ...]
let allVotes = [null, ayeVotes, nayVotes];

let $dataDisplay;

function postVotesToServer() {
	fetch('/cast-votes.json', {
		method: 'POST',
		headers: {
			'Content-type': 'application/json',
		},
		body: JSON.stringify({ votes: currentUserVotes }),
	});
}


function serverGet() {
	function buildVotesDict(votesFromServer, filterValue) {
		const filtered = votesFromServer.filter(v => v.value == filterValue);
		return filtered.reduce((acc, vote) => {
			if (!acc[vote.date]) acc[vote.date] = [];
			acc[vote.date].push(vote.user);
			return acc;
		}, {});
	}
	const payload = fetch('/votes.json', {}).then(response => {
		response.json().then(payload => {
			whoami = payload.whoami;
			document.title = whoami;
			/* Build ayeVotes, nayVotes, allVotes */
			ayeVotes = buildVotesDict(payload.votes, AYE);
			nayVotes = buildVotesDict(payload.votes, NAY);
			allVotes = [null, ayeVotes, nayVotes];
			/* Calc nVoters */
			const allVoters = payload.votes.reduce((acc, vote) => {
				acc.add(vote.user);
				return acc;
			}, new Set());
			allVoters.add(whoami);
			nVoters = allVoters.size;
			/* Set colours */
			for (const vote of payload.votes) {
				StatsMonther.update(vote.date);
				if (vote.user == whoami)
					UserMonther.colorDate(vote.date, vote.value);
			}
			$('#loading-screen').hide();
			$('#main').show();
		});
	});
}

class Monther {
	constructor (target, month) {
		this.month = month;
		this.target = target;
		this.table = document.createElement('table');
	}

	write () {
		const date = new Date(YEAR, this.month, 1);
		const table = this.table;
		let row = this.add(table, 'tr');
		const header = this.add(row, 'th', `${date.getFullYear()} ${monthNames[this.month]}`);
		header.colSpan = "7";
		$(header).css('text-align', 'center')
		row = this.add(table, 'tr'); // first row
		// Empty day cells
		const dow = date.getDay();
		for (let i = 0; i < dow % 7; i++) { this.add(row, 'td', null) }
		// Populated cells
		while (date.getMonth() == this.month) {
			const td = this.add(row, 'td', date.getDate());
			$(td).data('date', date.toDateString())
			this.processDateCell(td, date);
			date.setDate(date.getDate() + 1);
			if (date.getDay()	== 0) row = this.add(table, 'tr');
		}
		this.target.append(table);
	}

	add(parent, tag, content) {
		const el = document.createElement(tag);
		parent.appendChild(el);
		if (content) el.innerHTML = content;
		return el;
	}
}

class UserMonther extends Monther {
	write () {
		Monther.prototype.write.call(this)
		$(this.table).find('td').click((evt) => {
			const elem = $(evt.target);
			// update user vote and all votes
			this.incrementState(elem);
		});
	}

	incrementVotes(forVsAgainst, dateString, step) {
		const oldValue = allVotes[forVsAgainst][dateString] || 0;
		allVotes[forVsAgainst][dateString] = oldValue + step;
	}

	incrementState(tdElem) {
		const dateString = getDateString(tdElem);
		const oldState = currentUserVotes[dateString] || 0;
		const newState = (1 + oldState) % 3;
		// Update user vote
		currentUserVotes[dateString] = newState;
		// Update all votes
		if (oldState != 0) {
			const oldVotes = allVotes[oldState][dateString]||[];
			allVotes[oldState][dateString] = oldVotes.filter(x => x != whoami);
		}
		if (newState != 0) {
			if (! allVotes[newState][dateString])
				allVotes[newState][dateString] = [];
			allVotes[newState][dateString].push(whoami);
		}
		// Update class
		stateClasses.forEach((klass, i) => {
			if (i == newState)
				tdElem.addClass(klass);
			else
				tdElem.removeClass(klass);
		});
		// Repaint sister cell
		StatsMonther.update(dateString);
		// Ajax update server
		postVotesToServer();
	}

	static colorDate(dateString, voteValue) {
		const tdElem = dateString2UserCell[dateString];
		stateClasses.forEach((klass, i) => {
			if (i == voteValue)
				tdElem.addClass(klass);
			else
				tdElem.removeClass(klass);
		});
	}

	processDateCell (td, date) {
		const dateString = getDateString(td);
		dateString2UserCell[dateString] = $(td);
		$(td).addClass('clickable');
	}
}

class StatsMonther extends Monther {
	constructor(target, month) {
		super(target, month);
	}

	processDateCell (td, date) {
		td.innerHTML = '';
		const dateString = getDateString(td);
		dateString2VoteCell[dateString] = $(td);
		const table = document.createElement('table');
		const tr = document.createElement('tr')
		const dateCell = document.createElement('td');
		dateCell.innerHTML = date.getDate();
		tr.appendChild(dateCell);
		const ayeCell = document.createElement('td');
		$(ayeCell).addClass('for')
		ayeCell.innerHTML = '+';
		tr.appendChild(ayeCell);
		const nayCell = document.createElement('td');
		$(nayCell).addClass('against')
		nayCell.innerHTML = '&ndash;';
		tr.appendChild(nayCell);
		table.appendChild(tr);
		td.appendChild(table);
		$(td).mouseover(evt => {
			StatsMonther.setDataDisplay(dateString);
			$dataDisplay.show();
		});
	}

	static setDataDisplay(dateString) {
		$dataDisplay[0].innerHTML = '';
		$dataDisplay.append(`<div>${dateString}</div>`);
		let ul, li;
		$dataDisplay.append('<div>Votes for</div>');
		ul = document.createElement('ul');
		const ayeVotes = allVotes[AYE][dateString] || [];
		for (const voter of ayeVotes) {
			li = document.createElement('li');
			li.innerHTML = voter;
			ul.appendChild(li)
		}
		$dataDisplay[0].appendChild(ul);
		$dataDisplay.append('<div>Votes against</div>');
		ul = document.createElement('ul');
		const nayVotes = allVotes[NAY][dateString] || [];
		for (const voter of nayVotes) {
			li = document.createElement('li');
			li.innerHTML = voter;
			ul.appendChild(li)
		}
		$dataDisplay[0].appendChild(ul);
	}

	static update(dateString) {
		const $cell = $(dateString2VoteCell[dateString]);
		const $ayeCell = $cell.find('.for');
		const $nayCell = $cell.find('.against');
		const ayeVotes = allVotes[AYE][dateString]||[];
		const nayVotes = allVotes[NAY][dateString]||[];
		StatsMonther.setColor(AYE, ayeVotes.length, $ayeCell);
		StatsMonther.setColor(NAY, nayVotes.length, $nayCell);
	}

	static setColor (ayeOrNay, nVotes, targetTd) {
		const numerator = nVoters - (nVotes||0);
		const fraction = numerator * 255 / nVoters;
		const colors = [ fraction, fraction, fraction ];
		colors[1-(ayeOrNay-1)] = 255;
		$(targetTd).css('background-color', `rgb(${colors.join(', ')})`);
	}
}

function getDateString(td) {
	return $(td).data('date');
}

function getVotes(ayeOrNay, td) {
	const dateString = getDateString(td);
	return allVotes[ayeOrNay][dateString];
}

$(document).ready(() => {
	const main = $('#main');
	main.hide();
	const left = $('#left');
	const right = $('#right');
	$dataDisplay = $('#data-display')
	for (i = 5; i < 9; i++) {
		new UserMonther(left, i).write();
		new StatsMonther(right, i).write();	
	}
	serverGet();
});
