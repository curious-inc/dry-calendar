"use strict"
if(window['dry'] === undefined){ window.dry = {}; }
(function(){
var calendar = dry.calendar = (
function library(){

    // week_start: monday = 0, sunday = 6;
    function calendar(options){
        options = options || {};

        options.week_start = (options.week_start === undefined ? 0 : options.week_start);
        options.weeks_per_month = (options.weeks_per_month === undefined ? null : options.weeks_per_month);

        this.week_start(options.week_start);
        this.weeks_per_month(options.weeks_per_month);

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

    calendar.prototype.weeks_per_month = function(weeks){
        if(weeks === undefined){ return(this._weeks_per_month); }
        else if(_.isNumber(weeks) && weeks < 4){ weeks = 4; }
        this._weeks_per_month = weeks;
    };


    calendar.prototype._week_first_date = function(){
        var day_offset = this._weekday_number(this._start_date); 
        var week_first_date = this._start_date.clone();
        week_first_date.subtract(day_offset, "days");
        return(week_first_date);
    };
    
    calendar.prototype._week_last_date = function(){
        var end_date = this._end_date;
        if(this.weeks_per_month()){ 
            end_date = this._start_date.clone()
            end_date.add(this.weeks_per_month()-1, "weeks");
        }
        var day_offset = 6 - this._weekday_number(end_date); 
        var week_last_date = end_date.clone();
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
)();
var client_calendar = dry.client_calendar = (
function library(){

    function client_calendar(options){
        var self = this;

        calendar.class.call(self, options);

        var invalid_date = "2000-02-31";

        var date = _.moment(options.start_date || options.end_date || invalid_date);

        if(!date.isValid()){ 
            date = _.moment();
            _.log.warning("start_date or end_date is invalid, using default."); 
        }

        self._year_label = options.year_label !== false;

        self._start_date = date.clone().date(1);
        self._end_date = self._start_date.clone().add(1, "month").subtract(1, "day");

        self._last_date = options.last_date ? _.moment(options.last_date) : null;
        if(self._last_date && !self._last_date.isValid()){ self._last_date = null; }

        self._first_date = options.first_date ? _.moment(options.first_date) : null;
        if(self._first_date && !self._first_date.isValid()){ self._first_date = null; }

        self._selected_date = null;
        self._day_handler = options.day_handler || null;
        self._month_handler = options.month_handler || null;
        self._render_handler = options.render_handler || null;

        if(options.selector){
            self._root = $(options.selector);
        }else if(options.root){
            self._root = options.root;
        }else{
            _.fatal("You must provide a selector or a root element.");
        }

        self._switch_to_month = (options.switch_to_month === undefined ? true : options.switch_to_month);

        self._enable_next_month = true;
        self._enable_last_month = true;

        if(options.select){ self.select(options.select); }

        self.on("date_changed", function(d){ self._selected_date = d; });
    }

    _.inherit(client_calendar, calendar.class);
    _.event_emitter(client_calendar.prototype);

    client_calendar.prototype.first_date = calendar.class.prototype._date_setter("_first_date", "_first_date", "_last_date");
    client_calendar.prototype.last_date = calendar.class.prototype._date_setter("_last_date", "_first_date", "_last_date");
     
    client_calendar.prototype.year_label = _.rw("_year_label");

    client_calendar.prototype.date_within_range = function(m){
        if(m && m.isValid()){
            if(this._first_date && this._first_date.isAfter(m)){
                return(false);
            }
            if(this._last_date && this._last_date.isBefore(m)){
                return(false);
            }
            return(true);
        }else{ return(false); }
    };

    client_calendar.prototype.focus = function(date){
        var m = _.iso_date(date);

        if(this.date_within_range(m)){
            this._start_date = m.clone().date(1);
            this._end_date = this._start_date.clone().add(1, "month").subtract(1, "day");
            this.render();
        }else{
            _.log.warning("requested to focus date is out of range or invalid: ", date);
        }
    };

    client_calendar.prototype.select = function(date, focus){
        if(date === undefined){ return(this._selected_date); }
        if(date === null){ 
            this._selected_date = null;
            this.render();
        }else{
            var m = _.iso_date(date);

            if(this.date_within_range(m)){

                var new_date = _.iso_date(m);

                var prevent = false;
                var prevent_f = function(flag){ prevent = prevent || (flag !== false); }

                this.emit("date_selected", new_date, prevent_f);
                if(prevent){ return; }

                this._selected_date = new_date;

                this.emit("date_changed", new_date);

                if(focus !== false){ this.focus(this._selected_date); }
                else{ this.render(); }

            }else{
                _.log.warning("requested selected date is out of range or invalid: ", date);
                return;
            }
        }
    };

    client_calendar.prototype.month_handler = _.rw("_month_handler"); 
    client_calendar.prototype.day_handler = _.rw("_day_handler"); 
    client_calendar.prototype.render_handler = _.rw("_render_handler"); 

    client_calendar.prototype._$ = function(sel){ 
        if(!sel){ return(this._root); }
        else{ return(this._root.find(sel ? sel : "")); };
    };

    client_calendar.prototype.switch_to_month = _.rw("_switch_to_month");

    client_calendar.prototype._setup_month_options = function(){
        var self = this;

        var month_handler = self.month_handler() || _.noop;

        var next_month = self._compute_next_month();
        var last_month = self._compute_last_month();

        self._enable_next_month = true;
        self._enable_last_month = true;

        function make_hash(m, disable_f){
            return({ month: m.month(), year: m.year(), first_date: _.iso_date(self._first_day_of_month(m)), last_date: _.iso_date(self._last_day_of_month(m)), disable: disable_f });
        }

        var next_month_hash = make_hash(next_month, function(flag){ self._enable_next_month = (flag === false); });
        var last_month_hash = make_hash(last_month, function(flag){ self._enable_last_month = (flag === false); });

        var first_date = self.first_date();

        if(first_date && first_date > last_month_hash.last_date){
            self._enable_last_month = false;
        }else{
            month_handler(last_month_hash);
        }

        var last_date = self.last_date();

        if(last_date && last_date < next_month_hash.first_date){
            self._enable_next_month = false;
        }else{
            month_handler(next_month_hash);
        }
    };

    client_calendar.prototype._make_month_header = function(){

        var last_month_button = $('<td class="last_month"><span class="arrow">&lt;</span></td>');

        if(this._enable_last_month){ last_month_button.addClass("enabled"); }
        else{ last_month_button.addClass("disabled"); }

        var next_month_button = $('<td class="next_month"><span class="arrow">&gt;</span></td>');

        if(this._enable_next_month){ next_month_button.addClass("enabled"); }
        else{ next_month_button.addClass("disabled"); }

        var label = this.month_label(); 

        if(this._year_label){ label += " " + this._start_date.year(); }

        var month_label = $('<td colspan=5 >' + label + '</td>');
        
        var header_month = $('<tr class="month"></tr>');

        header_month.append(last_month_button);
        header_month.append(month_label);
        header_month.append(next_month_button);

        return(header_month);
    }

    client_calendar.prototype._make_header = function(){

        var header = $("<thead></thead>");
        var header_labels = $('<tr class="weekdays"></tr>');

        this.header(function(h){
            header_labels.append("<td>" + h + "</td>");
        });

        var header_month = this._make_month_header(); 

        header.append(header_month);
        header.append(header_labels);

        return(header);
    };

    client_calendar.prototype._make_body = function(){
        var self = this;

        var body = $("<tbody></tbody>");
        var row = $("<tr></tr>");

        var day_handler = self.day_handler() || _.noop;

        self.days(function(d){

            var td = $('<td class="day"><span>' + d.day + '</span></td>')
            td.addClass(d.date);
            td.data("date", d.date);

            if(self._selected_date && d.date === self._selected_date){
                td.addClass("active");
            }

            var current_month = self._start_date.month();
            if(d.month < current_month){
                if(current_month === 11 && d.month === 0){
                    d.next_month = true; 
                }else{
                    d.last_month = true;
                }
            }else if(d.month > current_month){
                if(current_month === 0 && d.month === 11){
                    d.last_month = true;
                }else{
                    d.next_month = true; 
                }
            }else{
                td.addClass("current_month");
            }

            if(d.next_month){ td.addClass("next_month"); }
            else if(d.last_month){ td.addClass("last_month"); }

            var disabled = false;

            if(self.first_date() && self.first_date() > d.date){
                disabled = true; 
            }else if(self.last_date() && self.last_date() < d.date){
                disabled = true; 
            }else{ 
                var day_hash = _.extend({ element: td, calendar: self }, d);
                day_hash.disable = function(flag){ flag = (flag !== false); disabled = flag; };
                day_hash.classes = function(classes){ td.addClass(classes); };
                day_handler(day_hash);
            }

            if(d.last_month && !self._enable_last_month){ disabled = true; td.addClass("invisible"); }
            if(d.next_month && !self._enable_next_month){ disabled = true; td.addClass("invisible"); }

            if(disabled){ td.addClass("disabled"); }
            else{ td.addClass("enabled"); }

            row.append(td);

            if(d.weekday === 6){ body.append(row); row = $("<tr></tr>"); }
        });

        return(body);
    };

    client_calendar.prototype.render = function(){

        this._setup_month_options();
        
        var header = this._make_header();
        var body = this._make_body();

        var table = $('<table class="calendar"></table>');

        table.append(header);
        table.append(body);

        if(this.render_handler()){ this.render_handler()(table); }

        this._$().empty();
        this._$().append(table);

        this._setup_button_handlers();
        this._setup_day_handlers();
    };

    client_calendar.prototype.class_date = function(date, classes){
        this._$("day." + date).addClass(classes);
    };

    client_calendar.prototype._setup_day_handlers = function(){
        var self = this;

        self._$("tbody .day.enabled").click(function(){
            var date = $(this).data("date");
            var elem = self._$("tbody .day." + date)

            var prevent = false;

            // we do the or, because this might pass through several event handlers
            var prevent_f = function(flag){ prevent = prevent || (flag !== false); }

            if(elem.hasClass("active")){
                self.emit("date_deselected", date, prevent_f);
                if(prevent){ return; }

                elem.removeClass("active");
                self.emit("date_changed", null);

            }else{
                self.emit("date_selected", date, prevent_f);
                if(prevent){ return; }

                self._$("tbody td.day").removeClass("active");
                elem.addClass("active");

                self.emit("date_changed", date);

                if(self.switch_to_month()){
                    if(elem.hasClass("next_month")){
                        self.next_month();
                        self.render();
                    }else if(elem.hasClass("last_month")){
                        self.last_month();
                        self.render();
                    }
                }
            }
        });
    };

    client_calendar.prototype._setup_button_handlers = function(){
        var self = this;

        self._$("thead .next_month.enabled").click(function(){
            self.next_month();
            self.render();
        });

        self._$("thead .last_month.enabled").click(function(){
            self.last_month();
            self.render();
        });
    };

    function client_calendar_factory(options){ return new client_calendar(options); }

    client_calendar_factory.library = library;
    client_calendar_factory.class = client_calendar;

    return(client_calendar_factory);
}
)();
})();
