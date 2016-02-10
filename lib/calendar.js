
var _ = require('dry-underscore');

function library(){

    // week_start: monday = 0, sunday = 6;
    function calendar(options){
        options = options || {};

        options.week_start = (options.week_start === undefined ? 0 : options.week_start);

        this.week_start(options.week_start);

        this._start_date = options.start_date ? _.moment(options.start_date) : null

        if(!this._start_date || !this._start_date.isValid()){ 
            _.log.warning("start_date is invalid, using default."); 
            this._start_date = _.moment().date(1);
        }

        this._end_date = options.end_date ? _.moment(options.end_date) : this._start_date.clone().add(1, "month").subtract(1, "day");

        if(!this._end_date || !this._end_date.isValid()){ 
            _.log.warning("end_date is invalid, using default."); 
            this._end_date = this._start_date.clone().add(30, "days");
        }

        this._day_labels = options.day_labels || ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
        this._month_labels = options.month_labels || ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        this._fix_dates();
    }

    var date_setter = calendar.prototype._date_setter = function date_setter(key, earlier_date_key, later_date_key){
        return(function(d, no_fix){
            if(d !== undefined){ 
                var test = _.moment(d);
                if(test.isValid()){
                    this[key] = test;
                }else{
                    _.log.warning(key.slice(1) + " is invalid, keeping the one we have."); 
                }
                if(no_fix !== true){ 
                    this._fix_dates(earlier_date_key, later_date_key);
                }
            }else if(this[key]){
                return(_.iso_date(this[key]));
            }else{ return(null); }
        });
    }

    calendar.prototype.start_date = date_setter("_start_date", "_start_date", "_end_date");
    calendar.prototype.end_date = date_setter("_end_date", "_start_date", "_end_date");

    calendar.prototype._first_day_of_month = function(m){
        return(m.clone().date(1)); 
    };

    calendar.prototype._last_day_of_month = function(m){
        return(m.clone().date(1).add(1, "month").subtract(1, "day"));
    };
 
    calendar.prototype._fix_dates = function(earlier_date_key, later_date_key){
        if(!this[earlier_date_key] || !this[later_date_key]){ return; }

        if(this[later_date_key].isBefore(this[earlier_date_key])){
            _.log.warning(earlier_date_key  + ": " + this[earlier_date_key] + " is after " + later_date_key + ": " + this[later_date_key] + "  swapping them."); 
            var temp = this[later_date_key];
            this[later_date_key] = this[earlier_date_key];
            this[earlier_date_key] = temp;
        }
    };

    calendar.prototype.week_start = function(day_number){
        if(day_number === undefined){ return(this._week_start); }
        else{ this._week_start = _.abs(day_number % 7); }
    };

    calendar.prototype._week_first_date = function(){
        var day_offset = this._weekday_number(this._start_date); 
        var week_first_date = this._start_date.clone();
        week_first_date.subtract(day_offset, "days");
        return(week_first_date);
    };
    
    calendar.prototype._week_last_date = function(){
        var day_offset = 6 - this._weekday_number(this._end_date); 
        var week_last_date = this._end_date.clone();
        week_last_date.add(day_offset, "days");
        return(week_last_date);
    };

    calendar.prototype._compute_next_month = function(){
        var next_month = this._start_date.clone();
        next_month.date(1).add(1, "month");
        return(next_month);
    };

    calendar.prototype._compute_last_month = function(){
        var last_month = this._start_date.clone();
        last_month.date(1).subtract(1, "month");
        return(last_month);
    };

    calendar.prototype.next_month = function(){
        this._end_date = this._compute_next_month().add(1, "month").subtract(1, "day");
        this._start_date = this._compute_next_month();
    };

    calendar.prototype.last_month = function(){
        this._end_date = this._compute_last_month().add(1, "month").subtract(1, "day");
        this._start_date = this._compute_last_month();
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
        var current = this._week_first_date();
        var week_last_date = this._week_last_date();

        var ret_val = [];

        if(!f){ f = function(d){ ret_val.push(d); }; }

        while(current.isSameOrBefore(week_last_date)){
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
        if(month === undefined){ month = this._start_date.month(); }
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
