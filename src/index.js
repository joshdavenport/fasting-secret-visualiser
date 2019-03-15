import './calendar-heatmap.css';
import calendarHeatmap from './calendar-heatmap';

const fastData = require('../data/fasting_days.json');

(function () {
    const dates = fastData.map(function (fastDay) {
        return {
            date: new Date(fastDay.date),
            countFrom: {
                start: fastDay.hours.fromStart,
                end: fastDay.hours.fromEnd
            }
        };
    });

    const chart = calendarHeatmap()
        .data(dates)
        .selector('#calendar');

    chart();
})();