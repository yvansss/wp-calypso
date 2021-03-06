/** @format */

/**
 * External dependencies
 */

import React, { Component } from 'react';
import { connect } from 'react-redux';
import Gridicon from 'gridicons';
import { localize } from 'i18n-calypso';
import { each, get, includes, isEqual, isUndefined, map } from 'lodash';

/**
 * Internal dependencies
 */
import Button from 'components/button';
import ButtonGroup from 'components/button-group';
import ControlItem from 'components/segmented-control/item';
import Count from 'components/count';
import CommentNavigationTab from './comment-navigation-tab';
import FormCheckbox from 'components/forms/form-checkbox';
import { isJetpackMinimumVersion, isJetpackSite } from 'state/sites/selectors';
import NavItem from 'components/section-nav/item';
import NavTabs from 'components/section-nav/tabs';
import Search from 'components/search';
import SectionNav from 'components/section-nav';
import SegmentedControl from 'components/segmented-control';
import UrlSearch from 'lib/url-search';
import {
	bumpStat,
	composeAnalytics,
	recordTracksEvent,
	withAnalytics,
} from 'state/analytics/actions';
import {
	changeCommentStatus,
	deleteComment,
	requestCommentsList,
	unlikeComment,
} from 'state/comments/actions';
import { removeNotice, successNotice } from 'state/notices/actions';
import { getSiteComment, hasPendingCommentRequests } from 'state/selectors';
import { NEWEST_FIRST, OLDEST_FIRST } from '../constants';
import { extendAction } from 'state/utils';

const bulkActions = {
	unapproved: [ 'approve', 'spam', 'trash' ],
	approved: [ 'unapprove', 'spam', 'trash' ],
	spam: [ 'approve', 'delete' ],
	trash: [ 'approve', 'spam', 'delete' ],
	all: [ 'approve', 'unapprove', 'spam', 'trash' ],
};

export class CommentNavigation extends Component {
	static defaultProps = {
		isSelectedAll: false,
		selectedComments: [],
		status: 'unapproved',
		order: NEWEST_FIRST,
	};

	shouldComponentUpdate = nextProps => ! isEqual( this.props, nextProps );

	componentDidUpdate = prevProps => {
		const { commentsListQuery, hasPendingBulkAction, refreshPage } = this.props;
		if ( commentsListQuery && ! hasPendingBulkAction && prevProps.hasPendingBulkAction ) {
			refreshPage( commentsListQuery );
		}
	};

	bulkDeletePermanently = () => {
		const { translate } = this.props;
		if (
			isUndefined( window ) ||
			window.confirm( translate( 'Delete these comments permanently?' ) )
		) {
			this.setBulkStatus( 'delete' )();
		}
	};

	changeFilter = status => () => this.props.recordChangeFilter( status );

	getNavItems = () => {
		const { translate } = this.props;
		const navItems = {
			all: {
				label: translate( 'All' ),
			},
			unapproved: {
				label: translate( 'Pending' ),
			},
			approved: {
				label: translate( 'Approved' ),
			},
			spam: {
				label: translate( 'Spam' ),
			},
			trash: {
				label: translate( 'Trash' ),
			},
		};

		return navItems;
	};

	getStatusPath = status => {
		const { postId } = this.props;

		const appendPostId = !! postId ? `/${ postId }` : '';

		return 'unapproved' !== status
			? `/comments/${ status }/${ this.props.siteFragment }${ appendPostId }`
			: `/comments/pending/${ this.props.siteFragment }${ appendPostId }`;
	};

	setBulkStatus = newStatus => () => {
		const {
			changeStatus,
			deletePermanently,
			postId: isPostView,
			recordBulkAction,
			selectedComments,
			status: queryStatus,
			toggleBulkMode,
			unlike,
		} = this.props;
		this.props.removeNotice( 'comment-notice' );
		each( selectedComments, ( { commentId, isLiked, postId, status } ) => {
			if ( 'delete' === newStatus ) {
				deletePermanently( postId, commentId );
				return;
			}
			const alsoUnlike = isLiked && 'approved' !== status;
			changeStatus( postId, commentId, newStatus, { alsoUnlike, previousStatus: status } );
			if ( alsoUnlike ) {
				unlike( postId, commentId );
			}
		} );

		recordBulkAction(
			newStatus,
			selectedComments.length,
			queryStatus,
			!! isPostView ? 'post' : 'site'
		);
		this.showBulkNotice( newStatus );
		toggleBulkMode();
	};

	showBulkNotice = newStatus => {
		const { translate } = this.props;

		const message = get(
			{
				approved: translate( 'All selected comments approved.' ),
				unapproved: translate( 'All selected comments unapproved.' ),
				spam: translate( 'All selected comments marked as spam.' ),
				trash: translate( 'All selected comments moved to trash.' ),
				delete: translate( 'All selected comments deleted permanently.' ),
			},
			newStatus
		);

		if ( ! message ) {
			return;
		}

		const noticeOptions = {
			id: 'comment-notice',
			isPersistent: true,
		};

		this.props.successNotice( message, noticeOptions );
	};

	statusHasAction = action => includes( bulkActions[ this.props.status ], action );

	toggleSelectAll = () => {
		if ( this.props.isSelectedAll ) {
			return this.props.toggleSelectAll( [] );
		}

		return this.props.toggleSelectAll( this.props.visibleComments );
	};

	render() {
		const {
			doSearch,
			hasSearch,
			hasComments,
			isBulkMode,
			isCommentsTreeSupported,
			isSelectedAll,
			query,
			selectedComments,
			setOrder,
			order,
			status: queryStatus,
			toggleBulkMode,
			translate,
		} = this.props;

		const navItems = this.getNavItems();
		const selectedCount = selectedComments.length;

		if ( isBulkMode ) {
			return (
				<SectionNav className="comment-navigation is-bulk-edit">
					<CommentNavigationTab className="comment-navigation__bulk-count">
						<FormCheckbox checked={ isSelectedAll } onChange={ this.toggleSelectAll } />
						<Count count={ selectedCount } />
					</CommentNavigationTab>
					<CommentNavigationTab className="comment-navigation__actions">
						<ButtonGroup>
							{ this.statusHasAction( 'approve' ) && (
								<Button
									compact
									disabled={ ! selectedCount }
									onClick={ this.setBulkStatus( 'approved' ) }
								>
									{ translate( 'Approve' ) }
								</Button>
							) }
							{ this.statusHasAction( 'unapprove' ) && (
								<Button
									compact
									disabled={ ! selectedCount }
									onClick={ this.setBulkStatus( 'unapproved' ) }
								>
									{ translate( 'Unapprove' ) }
								</Button>
							) }
						</ButtonGroup>
						<ButtonGroup>
							{ this.statusHasAction( 'spam' ) && (
								<Button
									compact
									scary
									disabled={ ! selectedCount }
									onClick={ this.setBulkStatus( 'spam' ) }
								>
									{ translate( 'Spam' ) }
								</Button>
							) }
							{ this.statusHasAction( 'trash' ) && (
								<Button
									compact
									scary
									disabled={ ! selectedCount }
									onClick={ this.setBulkStatus( 'trash' ) }
								>
									{ translate( 'Trash' ) }
								</Button>
							) }
							{ this.statusHasAction( 'delete' ) && (
								<Button
									compact
									scary
									disabled={ ! selectedCount }
									onClick={ this.bulkDeletePermanently }
								>
									{ translate( 'Delete' ) }
								</Button>
							) }
						</ButtonGroup>
					</CommentNavigationTab>
					<CommentNavigationTab className="comment-navigation__close-bulk">
						<Button borderless onClick={ toggleBulkMode } tabIndex="0">
							<Gridicon icon="cross" />
						</Button>
					</CommentNavigationTab>
				</SectionNav>
			);
		}

		return (
			<SectionNav className="comment-navigation" selectedText={ navItems[ queryStatus ].label }>
				<NavTabs selectedText={ navItems[ queryStatus ].label }>
					{ map( navItems, ( { label }, status ) => (
						<NavItem
							key={ status }
							onClick={ this.changeFilter( status ) }
							path={ this.getStatusPath( status ) }
							selected={ queryStatus === status }
						>
							{ label }
						</NavItem>
					) ) }
				</NavTabs>

				<CommentNavigationTab className="comment-navigation__actions comment-navigation__open-bulk">
					{ isCommentsTreeSupported &&
						hasComments && (
							<SegmentedControl compact className="comment-navigation__sort-buttons">
								<ControlItem
									onClick={ setOrder( NEWEST_FIRST ) }
									selected={ order === NEWEST_FIRST }
								>
									{ translate( 'Newest', {
										comment: 'Chronological order for sorting the comments list.',
									} ) }
								</ControlItem>
								<ControlItem
									onClick={ setOrder( OLDEST_FIRST ) }
									selected={ order === OLDEST_FIRST }
								>
									{ translate( 'Oldest', {
										comment: 'Chronological order for sorting the comments list.',
									} ) }
								</ControlItem>
							</SegmentedControl>
						) }

					{ hasComments && (
						<Button compact onClick={ toggleBulkMode }>
							{ translate( 'Bulk Edit' ) }
						</Button>
					) }
				</CommentNavigationTab>

				{ hasSearch && (
					<Search delaySearch fitsContainer initialValue={ query } onSearch={ doSearch } pinned />
				) }
			</SectionNav>
		);
	}
}

const mapStateToProps = ( state, { commentsPage, siteId } ) => {
	// eslint-disable-next-line wpcalypso/redux-no-bound-selectors
	const visibleComments = map( commentsPage, commentId => {
		const comment = getSiteComment( state, siteId, commentId );
		if ( comment ) {
			return {
				commentId,
				isLiked: get( comment, 'i_like' ),
				postId: get( comment, 'post.ID' ),
				status: get( comment, 'status' ),
			};
		}
	} );

	return {
		visibleComments,
		hasComments: visibleComments.length > 0,
		hasPendingBulkAction: hasPendingCommentRequests( state ),
		isCommentsTreeSupported:
			! isJetpackSite( state, siteId ) || isJetpackMinimumVersion( state, siteId, '5.3' ),
	};
};

const mapDispatchToProps = ( dispatch, { siteId, commentsListQuery } ) => ( {
	changeStatus: ( postId, commentId, status, analytics = { alsoUnlike: false } ) =>
		dispatch(
			extendAction(
				withAnalytics(
					composeAnalytics(
						recordTracksEvent( 'calypso_comment_management_change_status', {
							also_unlike: analytics.alsoUnlike,
							previous_status: analytics.previousStatus,
							status,
						} ),
						bumpStat( 'calypso_comment_management', 'comment_status_changed_to_' + status )
					),
					changeCommentStatus( siteId, postId, commentId, status )
				),
				{ meta: { comment: { commentsListQuery: commentsListQuery } } }
			)
		),
	deletePermanently: ( postId, commentId ) =>
		dispatch(
			extendAction(
				withAnalytics(
					composeAnalytics(
						recordTracksEvent( 'calypso_comment_management_delete' ),
						bumpStat( 'calypso_comment_management', 'comment_deleted' )
					),
					deleteComment( siteId, postId, commentId, { showSuccessNotice: true } )
				),
				{ meta: { comment: { commentsListQuery: commentsListQuery } } }
			)
		),
	recordBulkAction: ( action, count, fromList, view = 'site' ) =>
		dispatch(
			composeAnalytics(
				recordTracksEvent( 'calypso_comment_management_bulk_action', {
					action,
					count,
					from_list: fromList,
					view,
				} ),
				bumpStat( 'calypso_comment_management', 'bulk_action' )
			)
		),
	recordChangeFilter: status =>
		dispatch(
			composeAnalytics(
				recordTracksEvent( 'calypso_comment_management_change_filter', { status } ),
				bumpStat( 'calypso_comment_management', 'change_filter_to_' + status )
			)
		),
	removeNotice: noticeId => dispatch( removeNotice( noticeId ) ),
	refreshPage: query => dispatch( requestCommentsList( query ) ),
	successNotice: ( text, options ) => dispatch( successNotice( text, options ) ),
	unlike: ( postId, commentId ) =>
		dispatch(
			withAnalytics(
				composeAnalytics(
					recordTracksEvent( 'calypso_comment_management_unlike' ),
					bumpStat( 'calypso_comment_management', 'comment_unliked' )
				),
				unlikeComment( siteId, postId, commentId )
			)
		),
} );

export default connect( mapStateToProps, mapDispatchToProps )(
	localize( UrlSearch( CommentNavigation ) )
);
