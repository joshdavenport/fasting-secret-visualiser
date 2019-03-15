const moment = require('moment');
const d3 = require('d3');

export default function () {
    // defaults
    let width = 750;
    let height = 110;
    let selector = 'body';
    let SQUARE_LENGTH = 12;
    let SQUARE_PADDING = 1;
    let MONTH_LABEL_PADDING = 3;
    let now = moment().endOf('day').toDate();
    let yearAgo = moment().startOf('day').subtract(1, 'year').toDate();
    let startDate = null;
    let hoursMap = {};
    let data = [];
    let max = null;
    let colorRange = ['#D8E6E7', '#218380'];
    let tooltipEnabled = true;
    let tooltipUnit = 'hour';
    let onClick = null;
    let weekStart = 0; //0 for Sunday, 1 for Monday
    let locale = {
        months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        days: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
        No: 'No',
        on: 'on',
        Less: 'Less',
        More: 'More'
    };
    let v = Number(d3.version.split('.')[0]);

    // setters and getters
    chart.data = function (value) {
        if (!arguments.length) { return data; }
        data = value;

        hoursMap = {};

        data.forEach(function (element, index) {
            let key = moment(element.date).format('YYYY-MM-DD');
            hoursMap[key] = element.countFrom;
        });

        return chart;
    };

    chart.max = function (value) {
        if (!arguments.length) { return max; }
        max = value;
        return chart;
    };

    chart.selector = function (value) {
        if (!arguments.length) { return selector; }
        selector = value;
        return chart;
    };

    chart.startDate = function (value) {
        if (!arguments.length) { return startDate; }
        yearAgo = value;
        now = moment(value).endOf('day').add(1, 'year').toDate();
        return chart;
    };

    chart.colorRange = function (value) {
        if (!arguments.length) { return colorRange; }
        colorRange = value;
        return chart;
    };

    chart.tooltipEnabled = function (value) {
        if (!arguments.length) { return tooltipEnabled; }
        tooltipEnabled = value;
        return chart;
    };

    chart.tooltipUnit = function (value) {
        if (!arguments.length) { return tooltipUnit; }
        tooltipUnit = value;
        return chart;
    };

    chart.onClick = function (value) {
        if (!arguments.length) { return onClick(); }
        onClick = value;
        return chart;
    };

    chart.locale = function (value) {
        if (!arguments.length) { return locale; }
        locale = value;
        return chart;
    };

    function chart() {

        d3.select(chart.selector()).selectAll('svg.calendar-heatmap').remove(); // remove the existing chart, if it exists

        let dateRange = ((d3.time && d3.time.days) || d3.timeDays)(yearAgo, now); // generates an array of date objects within the specified range
        let monthRange = ((d3.time && d3.time.months) || d3.timeMonths)(moment(yearAgo).startOf('month').toDate(), now); // it ignores the first month if the 1st date is after the start of the month
        let firstDate = moment(dateRange[0]);
        if (chart.data().length == 0) {
            max = 0;
        } else if (max === null) {
            max = d3.max(chart.data(), function (d) { return d.count; }); // max data value
        }

        // color range
        let color = ((d3.scale && d3.scale.linear) || d3.scaleLinear)()
            .range(chart.colorRange())
            .domain([0, max]);

        let tooltip;
        let dayRects;

        drawChart();

        function drawChart() {
            let svg = d3.select(chart.selector())
                .style('position', 'relative')
                .append('svg')
                .attr('width', width)
                .attr('class', 'calendar-heatmap')
                .attr('height', height)
                .style('padding', '36px');

            dayRects = svg.selectAll('.day-cell')
                .data(dateRange);  //  array of days for the last yr

            let enterSelection = dayRects.enter().append('rect')
                .attr('class', 'day-cell')
                .attr('width', SQUARE_LENGTH)
                .attr('height', SQUARE_LENGTH)
                .attr('fill', '#ccc')
                .attr('x', function (d, i) {
                    let cellDate = moment(d);
                    let result = cellDate.week() - firstDate.week() + (firstDate.weeksInYear() * (cellDate.weekYear() - firstDate.weekYear()));
                    return result * (SQUARE_LENGTH + SQUARE_PADDING);
                })
                .attr('y', function (d, i) {
                    return MONTH_LABEL_PADDING + formatWeekday(d.getDay()) * (SQUARE_LENGTH + SQUARE_PADDING);
                });

            let fastFromStartSelection = dayRects.enter().append('rect')
                .attr('class', 'fast-overlay')
                .attr('width', SQUARE_LENGTH)
                .attr('height', function (d, i) {
                    return SQUARE_LENGTH / 24 * countForDate(d, 'start')
                })
                .attr('fill', '#000')
                .attr('x', function (d, i) {
                    let cellDate = moment(d);
                    let result = cellDate.week() - firstDate.week() + (firstDate.weeksInYear() * (cellDate.weekYear() - firstDate.weekYear()));
                    return result * (SQUARE_LENGTH + SQUARE_PADDING);
                })
                .attr('y', function (d, i) {
                    return MONTH_LABEL_PADDING + formatWeekday(d.getDay()) * (SQUARE_LENGTH + SQUARE_PADDING);
                });

            let fastFromEndSelection = dayRects.enter().append('rect')
                .attr('class', 'fast-overlay')
                .attr('width', SQUARE_LENGTH)
                .attr('height', function (d, i) {
                    return SQUARE_LENGTH / 24 * countForDate(d, 'end')
                })
                .attr('fill', '#000')
                .attr('x', function (d, i) {
                    let cellDate = moment(d);
                    let result = cellDate.week() - firstDate.week() + (firstDate.weeksInYear() * (cellDate.weekYear() - firstDate.weekYear()));
                    return result * (SQUARE_LENGTH + SQUARE_PADDING);
                })
                .attr('y', function (d, i) {
                    return MONTH_LABEL_PADDING + formatWeekday(d.getDay()) * (SQUARE_LENGTH + SQUARE_PADDING) + (SQUARE_LENGTH - (SQUARE_LENGTH / 24 * countForDate(d, 'end')));
                });

            // if (typeof onClick === 'function') {
            //     (v === 3 ? enterSelection : enterSelection.merge(dayRects)).on('click', function (d) {
            //         let count = countForDate(d);
            //         onClick({ date: d, count: count });
            //     });
            // }

            // if (chart.tooltipEnabled()) {
            //     (v === 3 ? enterSelection : enterSelection.merge(dayRects)).on('mouseover', function (d, i) {
            //         tooltip = d3.select(chart.selector())
            //             .append('div')
            //             .attr('class', 'day-cell-tooltip')
            //             .html(tooltipHTMLForDate(d))
            //             .style('left', function () { return Math.floor(i / 7) * SQUARE_LENGTH + 'px'; })
            //             .style('top', function () {
            //                 return formatWeekday(d.getDay()) * (SQUARE_LENGTH + SQUARE_PADDING) + MONTH_LABEL_PADDING * 2 + 'px';
            //             });
            //     })
            //         .on('mouseout', function (d, i) {
            //             tooltip.remove();
            //         });
            // }

            dayRects.exit().remove();
            let monthLabels = svg.selectAll('.month')
                .data(monthRange)
                .enter().append('text')
                .attr('class', 'month-name')
                .text(function (d) {
                    return locale.months[d.getMonth()];
                })
                .attr('x', function (d, i) {
                    let matchIndex = 0;
                    dateRange.find(function (element, index) {
                        matchIndex = index;
                        return moment(d).isSame(element, 'month') && moment(d).isSame(element, 'year');
                    });

                    return Math.floor(matchIndex / 7) * (SQUARE_LENGTH + SQUARE_PADDING);
                })
                .attr('y', 0);  // fix these to the top

            locale.days.forEach(function (day, index) {
                index = formatWeekday(index);
                if (index % 2) {
                    svg.append('text')
                        .attr('class', 'day-initial')
                        .attr('transform', 'translate(-8,' + (SQUARE_LENGTH + SQUARE_PADDING) * (index + 1) + ')')
                        .style('text-anchor', 'middle')
                        .attr('dy', '2')
                        .text(day);
                }
            });
        }

        function pluralizedTooltipUnit(count) {
            if ('string' === typeof tooltipUnit) {
                return (tooltipUnit + (count === 1 ? '' : 's'));
            }
            for (let i in tooltipUnit) {
                let _rule = tooltipUnit[i];
                let _min = _rule.min;
                let _max = _rule.max || _rule.min;
                _max = _max === 'Infinity' ? Infinity : _max;
                if (count >= _min && count <= _max) {
                    return _rule.unit;
                }
            }
        }

        function tooltipHTMLForDate(d) {
            let dateStr = moment(d).format('ddd, MMM Do YYYY');
            let count = countForDate(d);
            return '<span><strong>' + (count ? count : locale.No) + ' ' + pluralizedTooltipUnit(count) + '</strong> ' + locale.on + ' ' + dateStr + '</span>';
        }

        function countForDate(d, from) {
            let key = moment(d).format('YYYY-MM-DD');
            
            if(hoursMap[key]) {
                if(from) {
                    return hoursMap[key][from] || 0;
                } else {
                    return (hoursMap[key]['start'] + hoursMap[key]['end']) || 0;
                }
            } else {
                return 0;
            }
        }

        function formatWeekday(weekDay) {
            if (weekStart === 1) {
                if (weekDay === 0) {
                    return 6;
                } else {
                    return weekDay - 1;
                }
            }
            return weekDay;
        }

        let daysOfChart = chart.data().map(function (day) {
            return day.date.toDateString();
        });

    }

    return chart;
}