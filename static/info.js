'use strict';

const post = async () => {
	document.getElementById( 'mmlRes' ).innerText = '';
	document.getElementById( 'mmlResC' ).innerText = '';
	document.getElementById( 'svgRes' ).innerText = '';
	document.getElementById( 'svgResC' ).innerText = '';
	document.getElementById( 'styleRes' ).innerText = '';
	document.getElementById( 'styleResC' ).innerText = '';
	document.getElementById( 'checkedRes' ).innerHTML = '';

	function getReqBody( checked ) {
		return [].reduce.call( document.forms.item( 0 ).elements, ( X, x ) => {
			if ( x.id ) {
				if ( x.id === 'q' && checked ) {
					X += x.id + '=' + encodeURIComponent( checked ) + '&';
				} else {
					X += x.id + '=' + encodeURIComponent( x.value ) + '&';
				}
			}
			return X;
		}, '' );
	}

	async function updateImages( body, postfix = '' ) {
		const response = await fetch( '/complete', {
			method: 'POST',
			headers: { 'Content-type': 'application/x-www-form-urlencoded' },
			body: body
		} );
		const json = await response.json();
		if ( response.ok ) {
			document.getElementById( 'mmlRes' + postfix ).innerHTML = json.mml.body;
			document.getElementById( 'svgRes' + postfix ).innerHTML = json.svg.body;
			document.getElementById( 'styleRes' + postfix ).innerText = json.mathoidStyle;
		} else {
			document.getElementById( 'checkedRes' ).innerHTML = JSON.stringify( json, null, 2 );
		}
		return response;
	}

	let response = await updateImages( getReqBody() );
	if ( response.ok ) {
		response = await fetch( '/texvcinfo', {
			method: 'POST',
			headers: { 'Content-type': 'application/x-www-form-urlencoded' },
			body: getReqBody()
		} );
		if ( response.ok ) {
			const json = await response.json();
			document.getElementById( 'checkedRes' ).innerHTML = JSON.stringify( json, null, 2 );
			if ( json.checked ) {
				await updateImages( getReqBody( json.checked ), 'C' );
			}
		} else {
			const json = await response.json();
			document.getElementById( 'checkedRes' ).innerHTML = JSON.stringify( json, null, 2 );
		}
	}
};

document.addEventListener( 'DOMContentLoaded', () => {
	document.forms.requestForm.onsubmit = () => {
		post();
		return false;
	};
} );
