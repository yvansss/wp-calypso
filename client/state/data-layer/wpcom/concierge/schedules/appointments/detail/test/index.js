/** @format */

/**
 * Internal dependencies
 */
import { http } from 'state/data-layer/wpcom-http/actions';
import {
	fetchAppointmentDetails,
	storeFetchedAppointmentDetails,
	showAppointmentDetailsFetchError,
} from '../';
import { errorNotice } from 'state/notices/actions';
import { noRetry } from 'state/data-layer/wpcom-http/pipeline/retry-on-failure/policies';
import { updateConciergeAppointmentDetails } from 'state/concierge/actions';
import { CONCIERGE_APPOINTMENT_DETAILS_REQUEST } from 'state/action-types';

// we are mocking impure-lodash here, so that conciergeShiftsFetchError() will contain the expected id in the tests
jest.mock( 'lib/impure-lodash', () => ( {
	uniqueId: () => 'mock-unique-id',
} ) );

describe( 'wpcom-api', () => {
	describe( 'concierge', () => {
		test( 'fetchAppointmentDetails()', () => {
			const dispatch = jest.fn();
			const action = {
				type: CONCIERGE_APPOINTMENT_DETAILS_REQUEST,
				scheduleId: 123,
				appointmentId: 321,
			};

			fetchAppointmentDetails( { dispatch }, action );

			expect( dispatch ).toHaveBeenCalledWith(
				http(
					{
						method: 'GET',
						path: `/concierge/schedules/${ action.scheduleId }/appointments/${
							action.appointmentId
						}/detail`,
						apiNamespace: 'wpcom/v2',
						retryPolicy: noRetry(),
					},
					action
				)
			);
		} );

		test( 'storeFetchedAppointmentDetails()', () => {
			const dispatch = jest.fn();
			const mockAppointmentDetails = {
				id: 1,
				begin_timestamp: 123,
				options: {
					retryPolicy: { name: 'NO_RETRY' },
				},
			};

			storeFetchedAppointmentDetails(
				{ dispatch },
				{
					appointmentId: mockAppointmentDetails.id,
				},
				mockAppointmentDetails
			);

			expect( dispatch ).toHaveBeenCalledWith(
				updateConciergeAppointmentDetails( mockAppointmentDetails.id, mockAppointmentDetails )
			);
		} );

		test( 'showAppointmentDetailsFetchError()', () => {
			const dispatch = jest.fn();

			showAppointmentDetailsFetchError( { dispatch } );

			expect( dispatch ).toHaveBeenCalledWith(
				errorNotice( 'We could not find your appointment. Please try again later.' )
			);
		} );
	} );
} );