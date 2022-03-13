const FIRST = new Date(2022, 6, 1);
const LAST = new Date(2022, 8, 31);
const YEAR = 2022;
const AYE = 1;
const NAY = 2;

const N_VOTERS = 4; // todo: from server

const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const stateClasses = ['state-none', 'state-upvote', 'state-downvote'];

const dateString2VoteCell = {}; // dateString => td

const currentUserVotes = {}; // dateString => {0|1|2}

const votesFor = {
	'Sun Jul 03 2022': 4,
	'Mon Jul 04 2022': 1,
	'Tue Jul 05 2022': 2,
	'Wed Jul 06 2022': 3,
}; // dateString => int
const votesAgainst = {
	'Thu Jul 07 2022': 3,
	'Fri Jul 08 2022': 2,
	'Sat Jul 09 2022': 1,
	'Sun Jul 10 2022': 4,
}; // dateString => int
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
		StatsMonther.update(dateString);
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
		StatsMonther.update(date.toDateString());
	}

	static update(dateString) {
		const $cell = $(dateString2VoteCell[dateString]);
		const $ayeCell = $cell.find('.for');
		const $nayCell = $cell.find('.against');
		const ayeVotes = parseInt(allVotes[AYE][dateString]) || 0;
		const nayVotes = parseInt(allVotes[NAY][dateString]) || 0;
		StatsMonther.setColor(AYE, ayeVotes, $ayeCell);
		StatsMonther.setColor(NAY, nayVotes, $nayCell);
	}

	static setColor (forOrNay, nVotes, targetTd) {
		const numerator = N_VOTERS - (nVotes||0);
		const fraction = numerator * 255 / N_VOTERS;
		const colors = [ fraction, fraction, fraction ];
		colors[1-(forOrNay-1)] = 255;
		$(targetTd).css('background-color', `rgb(${colors.join(', ')})`);
	}
}

function getDateString(td) {
	return $(td).data('date');
}

function getVotes(forOrNay, td) {
	const dateString = getDateString(td);
	return allVotes[forOrNay][dateString];
}

$(document).ready(() => {
	const left = $('#left');
	const right = $('#right');
	for (i = 6; i < 9; i++) {
		new VoteMonther(left, i).write();
		new StatsMonther(right, i).write();	
	}
});
