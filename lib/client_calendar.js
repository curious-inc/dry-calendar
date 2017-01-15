
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

exports.library = library;
