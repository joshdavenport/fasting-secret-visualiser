import './calendar-heatmap.css';
import calendarHeatmap from './calendar-heatmap';

const fastData = require('../data/fasting_days.json');
// [{
//     date: new Date(),
//     count: 24
// }]
(function () {
    const dates = fastData.map(function (fastDay) {
        return {
            date: new Date(fastDay.date),
            count: fastDay.hours
        }
    });

    console.log(dates);

    const chart = calendarHeatmap()
        .data(dates)
        .selector('#calendar')
        .colorRange(['#D8E6E7', '#218380']);

    chart();
})();