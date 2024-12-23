'use strict';

class MyClass {

	_Id (elm) { return document.getElementById(elm); }

	alert (msg) {
		const dlg = document.getElementById('myacpd');
		dlg.className = 'alert';
		dlg.querySelector('.myacpd-msg').innerHTML = msg;
		dlg.showModal();
	}
	confirm (msg, opts={}) {
		return new Promise((resolve, reject) => {
			const dlg = document.getElementById('myacpdc');
			dlg.className = 'confirm';
			dlg.querySelector('.YB').innerHTML = opts.yesBtn??'Yes';
			dlg.querySelector('.NB').innerHTML = opts.noBtn??'No';
			dlg.querySelector('.myacpd-msg').innerHTML = msg;
			dlg.addEventListener('close', (e) => {
				console.log(e);
				resolve(dlg.returnValue==='y');
			}, {once:true});
			dlg.showModal();
		});
	}
	prompt (msg, defalt='', opts={}) {
		return new Promise((resolve, reject) => {
			const dlg = document.getElementById('myacpdp');
			let dflt = '';
			if (typeof defalt=='string') {
				dflt = defalt;
			} else {
				opts = defalt;
			}
			dlg.className = 'prompt';
			dlg.querySelector('.YB').innerHTML = opts.yesBtn??'Submit';
			dlg.querySelector('.NB').innerHTML = opts.noBtn??'Cancel';
			dlg.querySelector('.myacpd-msg').innerHTML = msg;
			dlg.querySelector('input').value = dflt;
			dlg.addEventListener('close', (e) => {
				console.log(e);
				if (dlg.returnValue==='y') resolve(dlg.querySelector('input').value);
				else resolve(false);
			}, {once:true});
			dlg.showModal();
		});
	};

}
// instantiate it
const my = new MyClass();


// a class for services to extend from for commonality 
class ServiceClass {

	oneItem (n) {
		if (!n) { my.alert('An item needs to be selected') }
		else if (n>1) { my.alert('Please select only one item.') }
		else { return true }
		return false;
	}
	hasSome (n) {
		if (n) return true;
		my.alert('Some items need to be selected');
		return false;
	}

}
