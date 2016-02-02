"use strict";

var _ = require('dry-underscore');
var calendar = require('../').calendar;

var eq = _.test.eq;
var ok = _.test.ok;

suite('calendar');

test("_weekday_number", function(){

    var c = calendar();

    var monday = _.iso_date("2016-02-01");
    var tuesday = _.iso_date("2016-02-02");
    var wednesday = _.iso_date("2016-02-03");

    eq(c._weekday_number(monday), 0);
    eq(c._weekday_number(tuesday), 1);
    eq(c._weekday_number(wednesday), 2);
    eq(c._iso_weekday_number(0), 0);
    eq(c._iso_weekday_number(1), 1);
    eq(c._iso_weekday_number(2), 2);

    c.week_start(1);
    eq(c._weekday_number(monday), 6);
    eq(c._weekday_number(tuesday), 0);
    eq(c._weekday_number(wednesday), 1);
    eq(c._iso_weekday_number(6), 0);
    eq(c._iso_weekday_number(0), 1);
    eq(c._iso_weekday_number(1), 2);
    
    c.week_start(2);
    eq(c._weekday_number(monday), 5);
    eq(c._weekday_number(tuesday), 6);
    eq(c._weekday_number(wednesday), 0);
    eq(c._iso_weekday_number(5), 0);
    eq(c._iso_weekday_number(6), 1);
    eq(c._iso_weekday_number(0), 2);
 
    c.week_start(-2);
    eq(c._weekday_number(monday), 5);
    eq(c._weekday_number(tuesday), 6);
    eq(c._weekday_number(wednesday), 0);
    eq(c._iso_weekday_number(5), 0);
    eq(c._iso_weekday_number(6), 1);
    eq(c._iso_weekday_number(0), 2);
 
    c.week_start(-9);
    eq(c._weekday_number(monday), 5);
    eq(c._weekday_number(tuesday), 6);
    eq(c._weekday_number(wednesday), 0);
    eq(c._iso_weekday_number(5), 0);
    eq(c._iso_weekday_number(6), 1);
    eq(c._iso_weekday_number(0), 2);
 
    c.week_start(9);
    eq(c._weekday_number(monday), 5);
    eq(c._weekday_number(tuesday), 6);
    eq(c._weekday_number(wednesday), 0);
    eq(c._iso_weekday_number(5), 0);
    eq(c._iso_weekday_number(6), 1);
    eq(c._iso_weekday_number(0), 2);
    eq(c._iso_weekday_number(1), 3);
    eq(c._iso_weekday_number(2), 4);
    eq(c._iso_weekday_number(3), 5);
    eq(c._iso_weekday_number(4), 6);
  
});

test("month movement", function(){

    var c = calendar({ start_date: _.iso_date("2016-02-01"), end_date: _.iso_date("2016-02-05") });

    eq(_.iso_date(c.start_date()), "2016-02-01");
    eq(_.iso_date(c.end_date()), "2016-02-05");

    c.next_month();
    eq(_.iso_date(c.start_date()), "2016-03-01");
    eq(_.iso_date(c.end_date()), "2016-03-31");

    c.last_month();
    eq(_.iso_date(c.start_date()), "2016-02-01");
    eq(_.iso_date(c.end_date()), "2016-02-29");

    c.last_month();
    eq(_.iso_date(c.start_date()), "2016-01-01");
    eq(_.iso_date(c.end_date()), "2016-01-31");

    c.next_month();
    eq(_.iso_date(c.start_date()), "2016-02-01");
    eq(_.iso_date(c.end_date()), "2016-02-29");

    c.next_month();
    eq(_.iso_date(c.start_date()), "2016-03-01");
    eq(_.iso_date(c.end_date()), "2016-03-31");

});

test("natural_days", function(){

    var expects = [
        { date: "2016-02-01", year: 2016, month: 1, day: 1, weekday: 0, label: "Mo" },
        { date: "2016-02-02", year: 2016, month: 1, day: 2, weekday: 1, label: "Tu" },
        { date: "2016-02-03", year: 2016, month: 1, day: 3, weekday: 2, label: "We" },
        { date: "2016-02-04", year: 2016, month: 1, day: 4, weekday: 3, label: "Th" },
        { date: "2016-02-05", year: 2016, month: 1, day: 5, weekday: 4, label: "Fr" },
        { date: "2016-02-06", year: 2016, month: 1, day: 6, weekday: 5, label: "Sa" },
        { date: "2016-02-07", year: 2016, month: 1, day: 7, weekday: 6, label: "Su" },
    ];

    var c = calendar({ start_date: _.iso_date("2016-02-01"), end_date: _.iso_date("2016-02-05") });

    var actual = [];

    c.days(function(d){ actual.push(d); });

    eq(actual, expects);
    eq(c.days(), expects);

});

test("header", function(){

    var expects = [ "Mo", "Tu", "We", "Th", "Fr", "Sa", "Su" ];

    var c = calendar({});

    var actual = [];
    c.header(function(h){ actual.push(h); });

    eq(c.header(), expects);
    eq(actual, expects);
});
 
test("header moved", function(){

    var expects = [ "We", "Th", "Fr", "Sa", "Su", "Mo", "Tu" ];

    var c = calendar({ week_start: 2 });

    var actual = [];
    c.header(function(h){ actual.push(h); });

    eq(c.header(), expects);
    eq(actual, expects);
});
 
test("moved_days", function(){

    var expects = [
        { date: "2016-01-27", year: 2016, month: 0, day: 27, weekday: 0, label: "We" },
        { date: "2016-01-28", year: 2016, month: 0, day: 28, weekday: 1, label: "Th" },
        { date: "2016-01-29", year: 2016, month: 0, day: 29, weekday: 2, label: "Fr" },
        { date: "2016-01-30", year: 2016, month: 0, day: 30, weekday: 3, label: "Sa" },
        { date: "2016-01-31", year: 2016, month: 0, day: 31, weekday: 4, label: "Su" },
        { date: "2016-02-01", year: 2016, month: 1, day: 1, weekday: 5, label: "Mo" },
        { date: "2016-02-02", year: 2016, month: 1, day: 2, weekday: 6, label: "Tu" },
        { date: "2016-02-03", year: 2016, month: 1, day: 3, weekday: 0, label: "We" },
        { date: "2016-02-04", year: 2016, month: 1, day: 4, weekday: 1, label: "Th" },
        { date: "2016-02-05", year: 2016, month: 1, day: 5, weekday: 2, label: "Fr" },
        { date: "2016-02-06", year: 2016, month: 1, day: 6, weekday: 3, label: "Sa" },
        { date: "2016-02-07", year: 2016, month: 1, day: 7, weekday: 4, label: "Su" },
        { date: "2016-02-08", year: 2016, month: 1, day: 8, weekday: 5, label: "Mo" },
        { date: "2016-02-09", year: 2016, month: 1, day: 9, weekday: 6, label: "Tu" },
    ];

    var c = calendar({ start_date: _.iso_date("2016-02-01"), end_date: _.iso_date("2016-02-05"), week_start: 2 });

    var actual = [];

    c.days(function(d){ actual.push(d); });

    eq(actual, expects);

});

test("moved_rows", function(){

    var expects = [
        [ 
        { date: "2016-01-27", year: 2016, month: 0, day: 27, weekday: 0, label: "We" },
        { date: "2016-01-28", year: 2016, month: 0, day: 28, weekday: 1, label: "Th" },
        { date: "2016-01-29", year: 2016, month: 0, day: 29, weekday: 2, label: "Fr" },
        { date: "2016-01-30", year: 2016, month: 0, day: 30, weekday: 3, label: "Sa" },
        { date: "2016-01-31", year: 2016, month: 0, day: 31, weekday: 4, label: "Su" },
        { date: "2016-02-01", year: 2016, month: 1, day: 1, weekday: 5, label: "Mo" },
        { date: "2016-02-02", year: 2016, month: 1, day: 2, weekday: 6, label: "Tu" },
        ], [
        { date: "2016-02-03", year: 2016, month: 1, day: 3, weekday: 0, label: "We" },
        { date: "2016-02-04", year: 2016, month: 1, day: 4, weekday: 1, label: "Th" },
        { date: "2016-02-05", year: 2016, month: 1, day: 5, weekday: 2, label: "Fr" },
        { date: "2016-02-06", year: 2016, month: 1, day: 6, weekday: 3, label: "Sa" },
        { date: "2016-02-07", year: 2016, month: 1, day: 7, weekday: 4, label: "Su" },
        { date: "2016-02-08", year: 2016, month: 1, day: 8, weekday: 5, label: "Mo" },
        { date: "2016-02-09", year: 2016, month: 1, day: 9, weekday: 6, label: "Tu" },
        ]
    ];

    var c = calendar({ start_date: _.iso_date("2016-02-01"), end_date: _.iso_date("2016-02-05"), week_start: 2 });

    var actual = [];

    c.rows(function(r){ actual.push(r); });

    eq(actual, expects);

});

