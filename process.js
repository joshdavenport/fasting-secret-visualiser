const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');
const _ = require('lodash');
const moment = require('moment');

let exportContent = fs.readFileSync(path.resolve(__dirname, './data/export.csv'), 'utf8');
exportContent = exportContent.replace(/(Fasts Started,[^,]*).*[\n|\r]*(Fasts Ended,[^,]*).*/g, '$1,$2');
fs.writeFileSync(path.resolve(__dirname, './data/export_processed.csv'), exportContent);

const stream = fs.createReadStream(path.resolve(__dirname, './data/export_processed.csv'));

let exportData = [];

const csvStream = csv()
    .on('data', data => {
        const startFastHeading = 'Fasts Started';
        const endFastHeading = 'Fasts Ended';
        const noEntryFastValue = 'No Entrys Today';

        if(data[0] === startFastHeading && data[2] === endFastHeading) {
            if(data[1] !== noEntryFastValue && data[3] === noEntryFastValue) {
                exportData.push(data[1]);
            } else if(data[1] === noEntryFastValue && data[3] !== noEntryFastValue) {
                exportData.push(data[3]);
            } else if(data[1] !== noEntryFastValue && data[3] !== noEntryFastValue) {
                exportData.push(data[3]);
                exportData.push(data[1]);
            } 
        }
    })
    .on('end', () => {
        const fasts = _(exportData)
            .chunk(2)
            .filter(fast => fast.length === 2)
            .map(fast => 
                _.map(fast, fastDate => moment(fastDate, 'DD-MM-YYYY HH:mm').toISOString())
            )
            .map(fast => {
                return {
                    start: fast[0],
                    end: fast[1]
                }
            })
            .value();

        fs.writeFileSync(path.resolve(__dirname, './data/export.json'), JSON.stringify(fasts, null, 2));

        const firstFastStartingMoment = moment(fasts[0].start)
            .hours(0).minutes(0).seconds(0);
        const lastFastEndingMoment = moment(fasts[fasts.length - 1].end)
            .hours(0).minutes(0).seconds(0).add(1, 'days');
        
        let fastData = [];
        let dayHoursData = {};

        for (let m = moment(firstFastStartingMoment); m.isBefore(lastFastEndingMoment); m.add(1, 'days')) {
            const day = m.format('DD-MM-YYYY');
            const hours = {fromStart: 0, fromEnd: 0};

            dayHoursData[day] = hours;

            fastData.push({ day, hours });
        }

        _.each(fasts, fast => {
            const fastStartMoment = moment(fast.start);
            const fastEndMoment = moment(fast.end);
            
            for (let m = moment(fastStartMoment); m.isBefore(fastEndMoment); m.add(1, 'hour')) {
                const day = m.format('DD-MM-YYYY');
                if(m.isSame(fastStartMoment, 'day')) {
                    dayHoursData[day].fromEnd = dayHoursData[day].fromEnd + 1;
                } else {
                    dayHoursData[day].fromStart = dayHoursData[day].fromStart + 1;
                }
            }
        });

        dayHoursData = _.map(_.keys(dayHoursData), date => {
            return {
                date: moment(date, 'DD-MM-YYYY')
                    .hours(0)
                    .minutes(0)
                    .seconds(0)
                    .toISOString(),
                hours: dayHoursData[date]
            }
        });
         
        fs.writeFileSync(path.resolve(__dirname, './data/fasting_days.json'), JSON.stringify(dayHoursData, null, 2));
    });
 
stream.pipe(csvStream);