"use strict"
if(window['dry'] === undefined){ window.dry = {}; }
(function(){
var calendar = dry.calendar = (
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
)();
var client_calendar = dry.client_calendar = (
function library(){

    function client_calendar(options){
        var self = this;

        calendar.class.call(self, options);

        self._selected_date = null;
        self._day_handler = options.day_handler || null;
        self._month_handler = options.month_handler || null;
        self._selector = options.selector || _.fatal("You must provide a selector.");

        self._switch_to_month = (options.switch_to_month === undefined ? true : options.switch_to_month);

        self._enable_next_month = true;
        self._enable_last_month = true;

        self.on("date_changed", function(d){ self._selected_date = d; });
    }

    _.inherit(client_calendar, calendar.class);
    _.event_emitter(client_calendar.prototype);

    client_calendar.prototype.month_handler = _.rw("_month_handler"); 
    client_calendar.prototype.day_handler = _.rw("_day_handler"); 

    client_calendar.prototype.$ = function(sel, no_space){ return($(this._selector + (no_space ? "" : " ") + (sel ? sel : ""))); };

    client_calendar.prototype.switch_to_month = _.rw("_switch_to_month");

    client_calendar.prototype._setup_month_options = function(){
        var self = this;

        var month_handler = self.month_handler() || _.noop;

        var next_month = self.compute_next_month();
        var last_month = self.compute_last_month();

        var next_month_hash = { month: next_month.month(), year: next_month.year() };
        var last_month_hash = { month: last_month.month(), year: last_month.year() };

        self._enable_next_month = true;
        self._enable_last_month = true;

        month_handler(next_month_hash, function(flag){ self._enable_next_month = (flag === false); });
        month_handler(last_month_hash, function(flag){ self._enable_last_month = (flag === false); });
    };

    client_calendar.prototype._make_month_header = function(){

        var last_month_button = $('<td class="last_month">&lt;</td>');

        if(this._enable_last_month){ last_month_button.addClass("enabled"); }
        else{ last_month_button.addClass("disabled"); }

        var next_month_button = $('<td class="next_month">&gt;</td>');

        if(this._enable_next_month){ next_month_button.addClass("enabled"); }
        else{ next_month_button.addClass("disabled"); }

        var month_label = $('<td colspan=5 >' + this.month_label() + '</td>');
        
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

            var td = $('<td class="day">' + d.day + '</td>')
            td.addClass(d.date);

            if(self._selected_date && d.date === self._selected_date){
                td.addClass("active");
            }

            var current_month = self.start_date().month();
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
            day_handler(d, function(flag){ flag = (flag !== false); disabled = flag; }, function(classes){ td.addClass(classes); });

            if(d.last_month && !self._enable_last_month){ disabled = true; td.addClass("hidden"); }
            if(d.next_month && !self._enable_next_month){ disabled = true; td.addClass("hidden"); }

            if(disabled){ td.addClass("disabled"); }
            else{ td.addClass("enabled"); }

            td.data("date", d.date);

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

        this.$().empty();
        this.$().append(table);

        this._setup_button_handlers();
        this._setup_day_handlers();
    };

    client_calendar.prototype.class_date = function(date, classes){
        this.$("day." + date).addClass(classes);
    };

    client_calendar.prototype._setup_day_handlers = function(){
        var self = this;

        self.$("tbody .day.enabled").click(function(){
            var date = $(this).data("date");
            var elem = self.$("tbody .day." + date)

            var prevent = false;
            var prevent_f = function(flag){ prevent = prevent || (flag !== false); }

            if(elem.hasClass("active")){
                self.emit("date_deselected", date, prevent_f);
                if(prevent){ return; }

                elem.removeClass("active");
                self.emit("date_changed", null);

            }else{
                self.emit("date_selected", date, prevent_f);
                if(prevent){ return; }

                self.$("tbody td.day").removeClass("active");
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

        self.$("thead .next_month.enabled").click(function(){
            self.next_month();
            self.render();
        });

        self.$("thead .last_month.enabled").click(function(){
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
