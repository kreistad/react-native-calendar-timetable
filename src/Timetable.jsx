import React from "react";
import {Text, useWindowDimensions, View, ScrollView} from "react-native";
import NowLine from "./NowLine";

function dateRangesOverlap(aStart, aEnd, bStart, bEnd) {
    if (aStart <= bStart && bStart <= aEnd)
        return true; // b starts in a
    if (aStart <= bEnd && bEnd <= aEnd)
        return true; // b ends in a
    if (bStart <= aStart && aEnd <= bEnd)
        return true; // a in b
    return false;
}

const hours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];

const minDiff = (a, b) => Math.floor(Math.abs(b - a) / 1000 / 60);
const daysDiff = (a, b) => Math.floor(Math.abs(b - a) / 1000 / 60 / 60 / 24) || 0;

const renderDefaultHeader = day => {
    const date = day.date.getDate();
    const month = day.date.getMonth();
    return `${date < 9 ? '0' + date : date}.${month < 9 ? '0' + month : month}`;
};

const validateRange = ({date, range}) => {
    for (const [key, value] of Object.entries({date, from: range?.from, till: range?.till})) {
        if (value && typeof value !== 'string' && !(value instanceof Date))
            console.error(`Invalid type of property ${key}. Expected nothing, instance of Date or ISO string, got ${value}`);
    }
};

/**
 * Timetable component
 * @param {!Object[]} props.items Array of items to render
 * @param {!Function} props.cardComponent React component used to render cards
 * @param {?Date} props.date Shortcut for 'range' prop, equals to {from: date, till: date}
 * @param {?Date} props.range.from
 * @param {?Date} props.range.till
 *
 * @param {?Object} props.style.container Styles of the main container
 * @param {?Object} props.style.headerContainer Styles of the container of column's header
 * @param {?Object} props.style.headerText Styles of the Text of column's header
 * @param {?Object} props.style.headersContainer Styles of the View that wraps all header containers
 * @param {?Object} props.style.contentContainer Styles of the container of lines and cards
 * @param {?Object} props.style.timeContainer Styles of time containers
 * @param {?Object} props.style.time Styles of time text
 * @param {?Object} props.style.lines Styles of Views that render lines
 * @param {?Object} props.style.nowLine.dot Styles of the circle of the 'current time' line
 * @param {?Object} props.style.nowLine.line Styles of the line of the 'current time' line
 *
 * @param {?Number} props.width Width of whole component
 * @param {?Number} props.timeWidth Width of time containers
 * @param {?Number} props.hourHeight Height of hour row
 * @param {?Number} props.columnWidth Width of day columns
 * @param {?Number} props.columnHeaderHeight Height of the container of column's header
 * @param {?Number} props.linesTopOffset How far the lines are from top border
 * @param {?Number} props.linesLeftInset How far the lines are moved left from time's right border
 * @param {?Number} props.columnHorizontalPadding Space between column borders and column cards
 *
 * @param {?Object} props.scrollViewProps
 * @param {?Function} props.renderHeader Function that renders column header text
 * @param {?string} props.startProperty Name of the item's start property
 * @param {?string} props.endProperty Name of the item's end property
 * @param {?number} props.fromHour
 * @param {?number} props.toHour
 *
 * @returns {JSX.Element}
 */
export default function Timetable(props) {
    __DEV__ && validateRange(props);

    const screenWidth = useWindowDimensions().width;

    const [items, setItems] = React.useState([]);
    const [range, setRange] = React.useState({
        from: new Date(props.date || props.range?.from),
        till: new Date(props.date || props.range?.till),
    });

    const fromHour = props.hasOwnProperty('fromHour') ? props.fromHour : 0;
    const toHour = props.hasOwnProperty('toHour') ? props.toHour : 24;

    const columnDays = React.useMemo(() => {
        const amountOfDays = daysDiff(range.till, range.from) + 1;
        const days = [];

        for (let i = 0; i < amountOfDays; i++) {
            const date = new Date(range.from);
            date.setDate(date.getDate() + i);

            const start = new Date(date);
            start.setHours(fromHour, 0, 0, 0);

            const end = new Date(date);
            end.setHours(toHour - 1, 59, 59, 999);

            days.push({date, start, end});
        }

        return days;
    }, [range.from, range.till, fromHour, toHour]);

    const width = props.hasOwnProperty('width') ? props.width : screenWidth;
    const timeWidth = props.hasOwnProperty('timeWidth') ? props.timeWidth : 50;
    const timeFontSize = props.style?.time?.fontSize || 14;

    const linesTopOffset = props.hasOwnProperty('linesTopOffset') ? props.linesTopOffset : 18;
    const linesLeftInset = props.hasOwnProperty('linesLeftInset') ? props.linesLeftInset : 15;
    const linesLeftOffset = timeWidth - linesLeftInset;

    const hourHeight = props.hasOwnProperty('hourHeight') ? props.hourHeight : 60;
    const minuteHeight = hourHeight / 60;

    const columnWidth = props.hasOwnProperty('columnWidth') ? props.columnWidth : width - (timeWidth - linesLeftInset);
    const columnHeaderHeight = props.hasOwnProperty('columnHeaderHeight') ? props.columnHeaderHeight : hourHeight / 2;

    const columnHorizontalPadding = props.hasOwnProperty('columnHorizontalPadding')
        ? props.columnHorizontalPadding
        : 10;

    const startProperty = props.startProperty || 'startDate';
    const endProperty = props.endProperty || 'endDate';

    /* Update range on props change */
    React.useEffect(() => {
        const from = props.date || props.range?.from;
        const till = props.date || props.range?.till;

        if (!from || !till)
            return;

        if (+(new Date(from)) === +range.from && +(new Date(till)) === +range.till)
            return;

        setRange({from, till});
    }, [props.date, props.range?.from, props.range?.till]);

    /* Calculate cards */
    React.useEffect(() => {
        if (!Array.isArray(props.items))
            return;

        const items = [];

        props.items?.forEach?.((item, dayIndex) => {
            if (typeof item !== "object") {
                __DEV__ && console.warn(`Invalid item of type [${typeof item}] supplied to Timetable, expected [object]`);
                return;
            }

            for (const {name, value} of [
                {name: 'start', value: item[startProperty]},
                {name: 'end', value: item[endProperty]},
            ]) {
                if (!value || (typeof value !== 'string' && typeof value !== 'object')) {
                    __DEV__ && console.warn(`Invalid ${name} date of item ${JSON.stringify(item)}, expected ISO string or Date object, got ${value}`);
                    return;
                }
            }

            const itemStart = new Date(item[startProperty]);
            const itemEnd = new Date(item[endProperty]);

            const daysTotal = daysDiff(itemStart, itemEnd) + 1;

            columnDays.forEach((columnDay, columnIndex) => {
                if (!dateRangesOverlap(columnDay.start, columnDay.end, itemStart, itemEnd))
                    return;

                const start = Math.max(+columnDay.start, +itemStart); // card begins either at column's beginning or item's start time, whatever is greater
                const end = Math.min(+columnDay.end + 1, +itemEnd); // card ends either at column's end or item's end time, whatever is lesser

                const height = minDiff(start, end) * minuteHeight;
                const top = calculateTopOffset(start);
                let width = columnWidth - (columnHorizontalPadding * 2);
                let left = linesLeftOffset + columnIndex * columnWidth + columnHorizontalPadding;

                if (columnIndex === 0) {
                    width = width - linesLeftInset;
                    left = left + linesLeftInset;
                }

                items.push({
                    key: '' + dayIndex + columnIndex + +itemStart + +itemEnd,
                    style: {position: 'absolute', zIndex: 3, width, height, top, left},
                    item,
                    dayIndex: dayIndex + 1,
                    daysTotal,
                });
            });
        });

        setItems(items);
    }, [
        props.items,
        columnDays,
        startProperty,
        endProperty,
        columnWidth,
        columnHorizontalPadding,
        linesLeftOffset,
        linesLeftInset,
        minuteHeight,
    ]);

    const calculateTopOffset = date => {
        const d = new Date(date);
        return (Math.max((d.getHours() - fromHour), 0) * 60 + d.getMinutes()) * minuteHeight + linesTopOffset;
    };

    return (
        <ScrollView horizontal={true} {...props.scrollViewProps}>
            <View style={props.style?.container}>
                <View style={[styles.row, props.style?.headersContainer]}>
                    {columnDays.length > 1 && columnDays.map((day, columnIndex) => (
                        <View key={String(columnIndex)} style={{
                            width: columnWidth,
                            height: columnHeaderHeight,
                            top: linesTopOffset,
                            marginLeft: columnIndex === 0 ? linesLeftOffset : undefined,
                            alignItems: 'center',
                            ...props.style?.headerContainer,
                        }}>
                            <Text style={props.style?.headerText}>
                                {(props.renderHeader || renderDefaultHeader)(day)}
                            </Text>
                        </View>
                    ))}
                </View>
                <View style={props.style?.contentContainer}>
                    {/* hours */}
                    {hours.map((hour, rowIndex) => {
                        return hour >= fromHour && hour <= toHour && (
                            <View key={rowIndex} style={styles.row}>
                                <View style={{
                                    position: 'absolute',
                                    zIndex: 2,
                                    top: 9,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    paddingHorizontal: 1,
                                    backgroundColor: 'white',
                                    ...props.style?.timeContainer,
                                    width: timeWidth,
                                }}>
                                    <Text style={props.style?.time}>
                                        {(hour > 9 ? '' : '0') + (hour === 24 ? '00' : hour) + ':00'}
                                    </Text>
                                </View>

                                {/* Day columns / hour lines */}
                                {columnDays.map((day, columnIndex) => (
                                    <View key={String(columnIndex)} style={{
                                        width: columnWidth,
                                        height: rowIndex === toHour ? linesTopOffset + timeFontSize / 2 : hourHeight,
                                        top: linesTopOffset,
                                        marginLeft: columnIndex === 0 ? linesLeftOffset : undefined,
                                        borderTopWidth: 1,
                                        borderLeftWidth: rowIndex === toHour ? 0 : 1,
                                        borderRightWidth: columnIndex === columnDays.length - 1 && rowIndex !== toHour ? 1 : 0,
                                        borderColor: 'gray',
                                        ...props.style?.lines,
                                    }}/>
                                ))}
                            </View>
                        );
                    })}

                    <NowLine
                        style={props.style?.nowLine}
                        calculateTopOffset={calculateTopOffset}
                        left={linesLeftOffset}
                        width={columnWidth * columnDays.length}
                    />

                    {/* Cards */}
                    {!!props.cardComponent && items.map(item => <props.cardComponent {...item}/>)}
                </View>
            </View>
        </ScrollView>
    );
}

const styles = {
    row: {
        flexDirection: 'row',
    },
};