/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

import Position from './position.js';
import Range from './range.js';
import EmitterMixin from '../../utils/emittermixin.js';
import CKEditorError from '../../utils/ckeditorerror.js';
import mix from '../../utils/mix.js';

/**
 * `Selection` is a group of {@link engine.model.Range ranges} which has a direction specified by
 * {@link engine.model.Selection#anchor anchor} and {@link engine.model.Selection#focus focus}.
 *
 * @memberOf engine.model
 */
export default class Selection {
	/**
	 * Creates an empty selection.
	 */
	constructor() {
		/**
		 * Specifies whether the last added range was added as a backward or forward range.
		 *
		 * @private
		 * @member {Boolean} engine.model.Selection#_lastRangeBackward
		 */
		this._lastRangeBackward = false;

		/**
		 * Stores all ranges that are selected.
		 *
		 * @private
		 * @member {Array.<engine.model.Range>} engine.model.Selection#_ranges
		 */
		this._ranges = [];
	}

	/**
	 * Selection anchor. Anchor may be described as a position where the selection starts. Together with
	 * {@link engine.model.Selection#focus} they define the direction of selection, which is important
	 * when expanding/shrinking selection. Anchor is always the start or end of the most recent added range.
	 *
	 * Is set to `null` if there are no ranges in selection.
	 *
	 * @see engine.model.Selection#focus
	 * @type {engine.model.Position|null}
	 */
	get anchor() {
		if ( this._ranges.length > 0 ) {
			const range = this._ranges[ this._ranges.length - 1 ];

			return this._lastRangeBackward ? range.end : range.start;
		}

		return null;
	}

	/**
	 * Selection focus. Focus is a position where the selection ends.
	 *
	 * Is set to `null` if there are no ranges in selection.
	 *
	 * @see engine.model.Selection#anchor
	 * @type {engine.model.Position|null}
	 */
	get focus() {
		if ( this._ranges.length > 0 ) {
			const range = this._ranges[ this._ranges.length - 1 ];

			return this._lastRangeBackward ? range.start : range.end;
		}

		return null;
	}

	/**
	 * Returns whether the selection is collapsed. Selection is collapsed when there is exactly one range which is
	 * collapsed.
	 *
	 * @type {Boolean}
	 */
	get isCollapsed() {
		const length = this._ranges.length;

		if ( length === 1 ) {
			return this._ranges[ 0 ].isCollapsed;
		} else {
			return false;
		}
	}

	/**
	 * Returns number of ranges in selection.
	 *
	 * @type {Number}
     */
	get rangeCount() {
		return this._ranges.length;
	}

	/**
	 * Specifies whether the {@link engine.model.Selection#focus} precedes {@link engine.model.Selection#anchor}.
	 *
	 * @type {Boolean}
	 */
	get isBackward() {
		return !this.isCollapsed && this._lastRangeBackward;
	}

	/**
	 * Adds a range to the selection. Added range is copied. This means that passed range is not saved in `Selection`
	 * instance and operating on it will not change `Selection` state.
	 *
	 * Accepts a flag describing in which way the selection is made - passed range might be selected from
	 * {@link engine.model.Range#start start} to {@link engine.model.Range#end end} or from {@link engine.model.Range#end end}
	 * to {@link engine.model.Range#start start}. The flag is used to set {@link engine.model.Selection#anchor} and
	 * {@link engine.model.Selection#focus} properties.
	 *
	 * @fires engine.model.Selection#change:range
	 * @param {engine.model.Range} range Range to add.
	 * @param {Boolean} [isBackward] Flag describing if added range was selected forward - from start to end (`false`)
	 * or backward - from end to start (`true`). Defaults to `false`.
	 */
	addRange( range, isBackward ) {
		this._pushRange( range );
		this._lastRangeBackward = !!isBackward;

		this.fire( 'change:range' );
	}

	/**
	 * Returns an iterator that iterates over copies of selection ranges.
	 *
	 * @returns {Iterator.<engine.model.Range>}
	 */
	*getRanges() {
		for ( let range of this._ranges ) {
			yield Range.createFromRange( range );
		}
	}

	/**
	 * Returns a copy of the first range in the selection. First range is the one which {@link engine.model.Range#start start} position
	 * {@link engine.model.Position#isBefore is before} start position of all other ranges (not to confuse with the first range
	 * added to the selection).
	 *
	 * Returns `null` if there are no ranges in selection.
	 *
	 * @returns {engine.model.Range|null}
	 */
	getFirstRange() {
		let first = null;

		for ( let i = 0; i < this._ranges.length; i++ ) {
			let range = this._ranges[ i ];

			if ( !first || range.start.isBefore( first.start ) ) {
				first = range;
			}
		}

		return first ? Range.createFromRange( first ) : null;
	}

	/**
	 * Returns the first position in the selection. First position is the position that {@link engine.model.Position#isBefore is before}
	 * any other position in the selection ranges.
	 *
	 * Returns `null` if there are no ranges in selection.
	 *
	 * @returns {engine.model.Position|null}
	 */
	getFirstPosition() {
		const first = this.getFirstRange();

		return first ? Position.createFromPosition( first.start ) : null;
	}

	/**
	 * Removes all ranges that were added to the selection. Fires update event.
	 *
	 * @fires engine.model.Selection#change:range
	 */
	removeAllRanges() {
		this._ranges = [];

		this.fire( 'change:range' );
	}

	/**
	 * Replaces all ranges that were added to the selection with given array of ranges. Last range of the array
	 * is treated like the last added range and is used to set {@link #anchor} and {@link #focus}. Accepts a flag
	 * describing in which way the selection is made (see {@link #addRange}).
	 *
	 * @fires engine.model.Selection#change:range
	 * @param {Array.<engine.model.Range>} newRanges Array of ranges to set.
	 * @param {Boolean} [isLastBackward] Flag describing if last added range was selected forward - from start to end (`false`)
	 * or backward - from end to start (`true`). Defaults to `false`.
	 */
	setRanges( newRanges, isLastBackward ) {
		this._ranges = [];

		for ( let i = 0; i < newRanges.length; i++ ) {
			this._pushRange( newRanges[ i ] );
		}

		this._lastRangeBackward = !!isLastBackward;

		this.fire( 'change:range' );
	}

	/**
	 * Sets collapsed selection in the specified location.
	 *
	 * The location can be specified in the same form as {@link engine.model.Position.createAt} parameters.
	 *
	 * @fires engine.model.Selection#change:range
	 * @param {engine.model.Node|engine.model.Position} nodeOrPosition
	 * @param {Number|'END'|'BEFORE'|'AFTER'} [offset=0] Offset or one of the flags. Used only when
	 * first parameter is a node.
	 */
	collapse( nodeOrPosition, offset ) {
		const pos = Position.createAt( nodeOrPosition, offset );
		const range = new Range( pos, pos );

		this.setRanges( [ range ] );
	}

	/**
	 * Sets {@link engine.model.Selection#focus} in the specified location.
	 *
	 * The location can be specified in the same form as {@link engine.model.Position.createAt} parameters.
	 *
	 * @fires engine.model.Selection#change:range
	 * @param {engine.model.Node|engine.model.Position} nodeOrPosition
	 * @param {Number|'END'|'BEFORE'|'AFTER'} [offset=0] Offset or one of the flags. Used only when
	 * first parameter is a node.
	 */
	setFocus( nodeOrPosition, offset ) {
		if ( this._ranges.length === 0 ) {
			/**
			 * Cannot set selection focus if there are no ranges in selection.
			 *
			 * @error selection-setFocus-no-ranges
			 */
			throw new CKEditorError( 'selection-setFocus-no-ranges: Cannot set selection focus if there are no ranges in selection.' );
		}

		const newFocus = Position.createAt( nodeOrPosition, offset );

		if ( newFocus.compareWith( this.focus ) == 'SAME' ) {
			return;
		}

		const anchor = this.anchor;

		if ( this._ranges.length ) {
			this._popRange();
		}

		if ( newFocus.compareWith( anchor ) == 'BEFORE' ) {
			this.addRange( new Range( newFocus, anchor ), true );
		} else {
			this.addRange( new Range( anchor, newFocus ) );
		}
	}

	/**
	 * Checks if given range intersects with ranges that are already in the selection. Throws an error if it does.
	 * This method is extracted from {@link engine.model.Selection#_pushRange } so it is easier to override it.
	 *
	 * @param {engine.model.Range} range Range to check.
	 * @protected
	 */
	_checkRange( range ) {
		for ( let i = 0; i < this._ranges.length; i++ ) {
			if ( range.isIntersecting( this._ranges[ i ] ) ) {
				/**
				 * Trying to add a range that intersects with another range from selection.
				 *
				 * @error selection-range-intersects
				 * @param {engine.model.Range} addedRange Range that was added to the selection.
				 * @param {engine.model.Range} intersectingRange Range from selection that intersects with `addedRange`.
				 */
				throw new CKEditorError(
					'selection-range-intersects: Trying to add a range that intersects with another range from selection.',
					{ addedRange: range, intersectingRange: this._ranges[ i ] }
				);
			}
		}
	}

	/**
	 * Removes most recently added range from the selection.
	 *
	 * @protected
	 */
	_popRange() {
		this._ranges.pop();
	}

	/**
	 * Adds given range to internal {@link engine.model.Selection#_ranges ranges array}. Throws an error
	 * if given range is intersecting with any range that is already stored in this selection.
	 *
	 * @protected
	 * @param {engine.model.Range} range Range to add.
	 */
	_pushRange( range ) {
		this._checkRange( range );
		this._ranges.push( Range.createFromRange( range ) );
	}
}

mix( Selection, EmitterMixin );

/**
 * Fired whenever selection ranges are changed through {@link engine.model.Selection Selection API}.
 *
 * @event engine.model.Selection#change:range
 */
