const FIRST = new Date(2022, 6, 1);
const LAST = new Date(2022, 8, 31);
const YEAR = 2022;
const FOR = 1;
const AGAINST = 2;

const N_VOTERS = 3;

const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const stateClasses = ['state-none', 'state-upvote', 'state-downvote'];

const dateString2VoteCell = {}; // dateString => td

const currentUserVotes = {}; // dateString => {0|1|2}

const votesFor = {} // dateString => int
const votesAgainst = {} // dateString => int
const allVotes = [null, votesFor, votesAgainst];

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

class VoteMonther extends Monther {
	write () {
		Monther.prototype.write.call(this)
		$(this.table).find('td').click((evt) => {
			const elem = $(evt.target);
			// update user vote and all votes
			this.incrementState(elem);
		});
	}

	/* Grab td for same date in right side */
	getSister (tdElem) {
		const dateString = getDateString(tdElem);
		return dateString2VoteCell[dateString];
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
		if (oldState != 0)
			this.incrementVotes(oldState, dateString, -1);
		if (newState != 0)
			this.incrementVotes(newState, dateString, 1);
		// Update class
		stateClasses.forEach((klass, i) => {
			if (i == newState)
				tdElem.addClass(klass);
			else
				tdElem.removeClass(klass);
		});
		// Repaint sister cell
		const sister = this.getSister(tdElem);
		setColor(FOR, allVotes[FOR][dateString], sister.find('td.for'));
		setColor(AGAINST, allVotes[AGAINST][dateString], sister.find('td.against'));
		// todo ajax update server
	}

	processDateCell (td) {
		$(td).addClass('clickable')
	}
}

class StatsMonther extends Monther {
	constructor(target, month) {
		super(target, month);
	}

	processDateCell (td, date) {
		td.innerHTML=''
		const dateString = getDateString(td);
		dateString2VoteCell[dateString] = $(td);
		const table = document.createElement('table');
		const tr = document.createElement('tr')
		this.dateCell = document.createElement('td');
		this.dateCell.innerHTML = date.getDate();
		tr.appendChild(this.dateCell);
		this.forCell = document.createElement('td');
		$(this.forCell).addClass('for')
		this.forCell.innerHTML = '+';
		tr.appendChild(this.forCell);
		this.againstCell = document.createElement('td');
		$(this.againstCell).addClass('against')
		this.againstCell.innerHTML = '&ndash;';
		tr.appendChild(this.againstCell);
		table.appendChild(tr);
		td.appendChild(table);
	}
}

function getDateString(td) {
	return $(td).data('date');
}

function setColor (forVsAgainst, nVotes, targetTd) {
	const numerator = N_VOTERS - (nVotes||0);
	const fraction = numerator * 255 / N_VOTERS;
	const colors = [ fraction, fraction, fraction ];
	colors[1-(forVsAgainst-1)] = 255;
	$(targetTd).css('background-color', `rgb(${colors.join(', ')})`);
}

$(document).ready(() => {
	const left = $('#left');
	const right = $('#right');
	for (i = 6; i < 9; i++) {
		new VoteMonther(left, i).write();
		new StatsMonther(right, i).write();	
	}
});
