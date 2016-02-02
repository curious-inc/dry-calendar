
var _ = require('dry-underscore');

function library(){

    // week_start: monday = 0, sunday = 6;
    function calendar(options){
        options = options || {};

        options.week_start = (options.week_start === undefined ? 0 : options.week_start);

        this.week_start(options.week_start);

        this._start_date = _.moment(options.start_date);

        if(!this.start_date().isValid()){ 
            _.log.warning("start_date is invalid, using default."); 
            this._start_date = _.moment().day(1);
        }

        this._end_date = options.end_date ? _.moment(options.end_date) : this._start_date.clone().add(1, "month").subtract(1, "day");

        if(!this.end_date().isValid()){ 
            _.log.warning("end_date is invalid, using default."); 
            this._end_date = this._start_date.clone().add(30, "days");
        }

        this._day_labels = options.day_labels || ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
        this._month_labels = options.month_labels || ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        this._fix_dates();
    }

    function date_setter(key){
        return(function(d){
            if(d !== undefined){ 
                var test = _.moment(d);
                if(test.isValid()){
                    this[key] = test;
                }else{
                    _.log.warning(key.slice(1) + " is invalid, keeping the one we have."); 
                }
                this._fix_dates();
            }
            return(this[key]);
        });
    }

    calendar.prototype.start_date = date_setter("_start_date");
    calendar.prototype.end_date = date_setter("_end_date");
 
    calendar.prototype._fix_dates = function(){
        if(this.end_date().isBefore(this.start_date())){
            _.log.warning("start_date is after end_date, swapping them."); 
            this._swap_dates();
        }
    };

    calendar.prototype._swap_dates = function(){
        var temp = this._end_date;
        this._end_date = this._start_date;
        this._start_date = temp;
    };

    calendar.prototype.week_start = function(day_number){
        if(day_number === undefined){ return(this._week_start); }
        else{ this._week_start = _.abs(day_number % 7); }
    };

    calendar.prototype.first_date = function(){
        var day_offset = this._weekday_number(this.start_date()); 
        var first_date = this.start_date().clone();
        first_date.subtract(day_offset, "days");
        return(first_date);
    };
    
    calendar.prototype.compute_next_month = function(){
        var next_month = this.start_date().clone();
        next_month.date(1).add(1, "month");
        return(next_month);
    };

    calendar.prototype.compute_last_month = function(){
        var last_month = this.start_date().clone();
        last_month.date(1).subtract(1, "month");
        return(last_month);
    };

    calendar.prototype.next_month = function(){
        this._end_date = this.compute_next_month().add(1, "month").subtract(1, "day");
        this._start_date = this.compute_next_month();
    };

    calendar.prototype.last_month = function(){
        this._end_date = this.compute_last_month().add(1, "month").subtract(1, "day");
        this._start_date = this.compute_last_month();
    };

    calendar.prototype.last_date = function(){
        var day_offset = 6 - this._weekday_number(this.end_date()); 
        var last_date = this.end_date().clone();
        last_date.add(day_offset, "days");
        return(last_date);
    };

    calendar.prototype._weekday_number = function(d){
        if(!_.isNumber(d)){ d = d.isoWeekday() - 1; }
        return(((7 - this.week_start()) + d) % 7);
    };

    calendar.prototype._iso_weekday_number = function(d){
        if(!_.isNumber(d)){ return(d.isoWeekday() - 1); }
        return((d + this.week_start()) % 7);
    };


    calendar.prototype.header = function(f){
        var self = this;

        var header = [];
        if(!f){ f = function(h){ header.push(h); }; }

        _.f(7, function(i){
            f(self.weekday_label(i));
        });

        return(header);
    };

    calendar.prototype.days = function(f){
        var current = this.first_date();
        var last_date = this.last_date();

        var ret_val = [];

        if(!f){ f = function(d){ ret_val.push(d); }; }

        while(current.isSameOrBefore(last_date)){
            var weekday = this._weekday_number(current);
            f({ date: _.iso_date(current), year: current.year(), month: current.month(), day: current.date(), weekday: weekday, label: this.weekday_label(weekday) });
            current.add(1, "day");
        }

        return(ret_val);
    };

    calendar.prototype.rows = function(f){

        var ret_val = [];

        if(!f){ f = function(d){ ret_val.push(d); }; }

        var row = [];

        this.days(function(d, last_day){
            row.push(d);
            if(d.weekday === 6){ f(row); row = []; }
        });

        return(ret_val);
    };

    calendar.prototype.month_label = function(month){
        if(month === undefined){ month = this.start_date().month(); }
        return(this._month_labels[month]);
    };

    calendar.prototype.weekday_label = function(day){
        return(this._day_labels[this._iso_weekday_number(day)]);
    };

    function calendar_factory(options){ return new calendar(options); }

    calendar_factory.library = library;
    calendar_factory.class = calendar;

    return(calendar_factory);
}

exports.library = library;
