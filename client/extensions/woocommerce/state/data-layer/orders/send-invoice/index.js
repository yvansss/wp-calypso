/** @format */
/**
 * Internal dependencies
 */
import { createNoteSuccess } from 'woocommerce/state/sites/orders/notes/actions';
import { dispatchRequestEx } from 'state/data-layer/wpcom-http/utils';
import {
	orderInvoiceFailure,
	orderInvoiceSuccess,
} from 'woocommerce/state/sites/orders/send-invoice/actions';
import request from 'woocommerce/state/sites/http-request';
import { WOOCOMMERCE_ORDER_INVOICE_SEND } from 'woocommerce/state/action-types';

export const fetch = action => {
	const { siteId, orderId } = action;
	return request( siteId, action ).post( `orders/${ orderId }/send_invoice` );
};

export function fromApi( response ) {
	// Check if the request failed at the remote site.
	if ( ! response.data ) {
		throw new Error( 'Unable to send invoice', response );
	}
	return response;
}

export const onError = ( action, error ) => dispatch => {
	const { siteId, orderId } = action;
	dispatch( orderInvoiceFailure( siteId, orderId, error ) );
	if ( action.onFailure ) {
		dispatch( action.onFailure );
	}
};

export const onSuccess = ( action, { data } ) => dispatch => {
	const { siteId, orderId } = action;
	dispatch( orderInvoiceSuccess( siteId, orderId, data ) );
	dispatch( createNoteSuccess( siteId, orderId, data ) );
	if ( action.onSuccess ) {
		dispatch( action.onSuccess );
	}
};

export default {
	[ WOOCOMMERCE_ORDER_INVOICE_SEND ]: [
		dispatchRequestEx( { fetch, onSuccess, onError, fromApi } ),
	],
};
