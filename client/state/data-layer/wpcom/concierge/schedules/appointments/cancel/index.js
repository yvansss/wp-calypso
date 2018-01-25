/** @format */

/**
 * Internal dependencies
 */
import { http } from 'state/data-layer/wpcom-http/actions';
import { dispatchRequest } from 'state/data-layer/wpcom-http/utils';
import { updateConciergeBookingStatus } from 'state/concierge/actions';
import { errorNotice } from 'state/notices/actions';
import { CONCIERGE_APPOINTMENT_CANCEL } from 'state/action-types';
import {
	CONCIERGE_STATUS_CANCELLED,
	CONCIERGE_STATUS_CANCELLING,
	CONCIERGE_STATUS_CANCELLING_ERROR,
} from 'me/concierge/constants';
import fromApi from './from-api';
import { recordTracksEvent, withAnalytics } from 'state/analytics/actions';

export const cancelConciergeAppointment = ( { dispatch }, action ) => {
	dispatch( updateConciergeBookingStatus( CONCIERGE_STATUS_CANCELLING ) );

	dispatch(
		http(
			{
				method: 'POST',
				path: `/concierge/schedules/${ action.scheduleId }/appointments/${
					action.appointmentId
				}/cancel`,
				apiNamespace: 'wpcom/v2',
				body: {},
			},
			action
		)
	);
};

export const markSlotAsCancelled = ( { dispatch } ) => {
	dispatch(
		withAnalytics(
			recordTracksEvent( 'calypso_concierge_appointment_cancellation_successful' ),
			updateConciergeBookingStatus( CONCIERGE_STATUS_CANCELLED )
		)
	);
};

export const handleCancellingError = ( { dispatch } ) => {
	dispatch(
		withAnalytics(
			recordTracksEvent( 'calypso_concierge_appointment_cancellation_error' ),
			updateConciergeBookingStatus( CONCIERGE_STATUS_CANCELLING_ERROR )
		)
	);
	dispatch( errorNotice( "We couldn't cancel your session, please try again later." ) );
};

export default {
	[ CONCIERGE_APPOINTMENT_CANCEL ]: [
		dispatchRequest( cancelConciergeAppointment, markSlotAsCancelled, handleCancellingError, {
			fromApi,
		} ),
	],
};