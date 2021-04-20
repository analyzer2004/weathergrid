// https://github.com/analyzer2004/weathergrid
// Copyright 2021 Eric Lo
class InfoGraphic {
    constructor(container) {
        this._container = container;        
        this._infoBox = null;
        this._textBox = null;
        this._charBox = null;

        this._tooltip = {
            color: "black",
            boxColor: "white",
            boxOpacity: 0.8
        };        

        // events
        this._onhover = null;
        this._onclick = null;
    }

    tooltip(_) {
        return arguments.length ? (this._tooltip = Object.assign(this._tooltip, _), this) : this._tooltip;
    }

    onhover(_) {
        return arguments.length ? (this._onhover = _, this) : this._onhover;
    }

    onclick(_) {
        return arguments.length ? (this._onclick = _, this) : this._onclick;
    }

    _init() {
        this._textBox = this._container
            .append("text")
            .attr("font-family", this._font.fontFamily)
            .style("visibility", "hidden");

        String.prototype.capitalize = function () {
            return this.charAt(0).toUpperCase() + this.slice(1)
        }
    }

    // Tooltip
    //
    _attachEvents(target, content) {
        target
            .on("pointerenter", (e, d) => {
                this._showTooltip(e, content(d));
                if (this._onhover) this._onhover(d);
            })
            .on("pointermove", (e, d) => { this._moveTooltip(e); })
            .on("pointerleave", () => { this._hideTooltip(); })
            .on("click", (e, d) => { if (this._onclick) this._onclick(d); });
    }

    _showTooltip(e, info) {
        if (!this._charBox) {
            this._charBox = this._textBox.text("M").node().getBBox();
        }

        var max = 0;
        info.forEach(s => {
            const l = this._calcTextLength(s);
            if (l > max) max = l;
        })

        if (!this._infoBox)
            this._infoBox = this._og
                .append("g")
                .attr("fill", this._tooltip.color)
                .call(g => g.append("rect")
                    .attr("class", "ibbg")
                    .attr("opacity", this._tooltip.boxOpacity)
                    .attr("stroke", "#aaa")
                    .attr("stroke-width", 0.5)
                    .attr("rx", 4).attr("ry", 4)
                    .attr("x", -5).attr("y", -5)
                    .attr("fill", this._tooltip.boxColor));

        const spacing = 1.1;
        this._infoBox
            .style("visibility", "visible")
            .select(".ibbg")
            .attr("width", max + 20).attr("height", spacing * this._charBox.height * info.length + 5);

        this._infoBox
            .selectAll("text")
            .data(info)
            .join(
                enter => {
                    enter
                        .append("text")
                        .attr("dy", (d, i) => `${spacing * i + 1}em`)
                        .attr("font-weight", (d, i) => i === 0 ? "bold" : "")
                        .text(d => d);
                },
                update => update.text(d => d),
                exit => exit.remove()
            );

        this._moveTooltip(e);
    }

    _moveTooltip(e) {
        const
            converted = this._convertCoordinate(e, this._og),
            box = this._infoBox.node().getBBox();

        const { left, top } = this._calcTooltipPosition(converted, box);
        this._infoBox.attr("transform", `translate(${left + 10},${top + 10})`);
    }

    _calcTooltipPosition(converted, box) {
        return { left: converted.x, top: converted.y };
    }

    _hideTooltip(d) {
        if (this._infoBox) this._infoBox.style("visibility", "hidden");
    }

    // Utilities
    //
    _getSVG() {
        let curr = this._container.node();
        while (curr && curr.tagName !== "svg")
            curr = curr.parentElement;
        return curr;
    }

    _convertCoordinate(e, g) {
        const svg = this._getSVG();
        if (svg) {
            // convert to SVG coordinates
            const p = svg.createSVGPoint()
            p.x = e.clientX;
            p.y = e.clientY;
            return p.matrixTransform(g.node().getScreenCTM().inverse());
        }
        else {
            throw "Unable to find SVG element";
        }
    }

    _calcTextLength(text) {
        return this._textBox.text(text).node().getBBox().width;
    }
}

class WeatherGrid extends InfoGraphic {
    constructor(container) {
        super(container);
        
        this._og = null; // Outer group        

        this._month = 0;
        this._months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        this._scheme = ["#d73027", "#fc8d59", "#fee090", "#d1e5f0", "#67a9cf", "#2166ac"];
        this._condColors = {
            clear: { color: "#fee090", icon: "" },
            cloudy: { color: "#e7d8c9", icon: "" },
            overcast: { color: "#ddd", icon: "" },
            rain: { color: "#98c1d9", icon: "" },
            snow: { color: "#c2dfe3", icon: "" }
        };
        this._elemColors = {
            tempHigh: this._scheme[1],
            tempLow: this._scheme[4],
            tempAvg: "#aaa"
        };

        this._options = {
            tempUnit: "°F",
            tempScale: "month",
            cellColor: "temperature",
            dateFormat: "%m/%d/%Y"
        };

        this._font = {
            fontFamily: "Times New Roman",
            size: {
                statistic: 9,
                legend: 10,
                gridLabel: 12
            }
        };

        this._data = null;
        this._monthlyData = null;
        this._groupedData = null;
        this._years = null;
        this._days = null;
        this._tempSegs = null;
        this._column = {
            date: "date",
            low: "min",
            high: "max",
            avg: "avg",
            condition: "condition"
        };

        this._elemDims = {
            legend: 100, // legend width
            dayLabel: 40, // day label width
            tempChart: 100, // temperature chart height
            statChart: 100, // statistic chart height
            avgLabel: 30, // average temperature label height
            yearLabel: 70, // year label height
            partMargin: 10, // margin between main parts
        };

        this._gridMargin = {
            left: this._elemDims.legend + this._elemDims.dayLabel,
            top: this._elemDims.avgLabel + this._elemDims.yearLabel
        };

        this._iconSize = 28;
        this._cellPadding = 4;
        this._gridDims = {
            width: 0,
            height: 0
        }

        // Scales
        this._x = null;
        this._y = null;
        this._c = null;
        this._tempY = null;
    }

    options(_) {
        return arguments.length ? (this._options = Object.assign(this._options, _), this) : this._options;
    }

    font(_) {
        return arguments.length ? (this._font = Object.assign(this._font, _), this) : this._font;
    }

    month(_) {
        return arguments.length ? (this._month = _, this) : this._month;
    }

    column(_) {
        return arguments.length ? (this._column = _, this) : this._column;
    }

    icon(_) {
        if (arguments.length) {
            this._condColors.clear.icon = _.clear;
            this._condColors.cloudy.icon = _.cloudy;
            this._condColors.overcast.icon = _.overcast;
            this._condColors.rain.icon = _.rain;
            this._condColors.snow.icon = _.snow;
            return this;
        }
        else {
            return Object
                .keys(this._condColors)
                .map(k => this._condColors[k].icon);
        }
    }

    data(_) {
        return arguments.length ? (this._data = _, this) : this._data;
    }

    _updateViewbox() {        
        const
            e = this._elemDims,
            g = this._gridDims,
            w = e.legend + e.dayLabel + g.width + 10,
            h = e.statChart + e.tempChart + e.partMargin + e.avgLabel + e.yearLabel + g.height;

        const svg = this._getSVG();
        if (svg) d3.select(svg).attr("viewBox", `0,0,${w},${h}`);
        return { w, h };
    }

    render() {
        this._init();
        this._process();
        this._initScales();
        this._render();
        return this;
    }

    _init() {
        super._init();
    }

    _process() {
        const
            c = this._column,
            condMap = this._getConditionMap();

        // Transform and filter
        this._monthlyData = this._data.map(d => ({
            date: d3.timeParse(this._options.dateFormat)(d[c.date]),
            max: +d[c.high],
            min: +d[c.low],
            avg: +d[c.avg],
            cond: condMap.get(d[c.condition])
        })).filter(d => d.date.getMonth() === this._month);

        // Group by year 
        const grouped = d3.group(this._monthlyData, d => d.date.getFullYear());
        for (let [k, v] of grouped) {
            grouped.set(k, {
                year: k,
                max: d3.max(v.map(d => d.max)),
                min: d3.min(v.map(d => d.min)),
                avg: v.reduce((a, b) => a + b.avg, 0) / v.length,
                data: v
            });
        }

        this._groupedData = grouped;
        this._years = [...grouped.keys()];
        this._days = [...new Set(this._monthlyData.map(d => d.date.getDate()))];        
        this._gridDims.width = (this._iconSize + this._cellPadding * 2 + 1) * this._years.length;
        this._gridDims.height = (this._iconSize + this._cellPadding * 2 + 1) * d3.max(this._days);
    }

    _getConditionMap() {
        const map = new Map();
        map.set("Rain, Overcast", "rain");
        map.set("Rain, Partially cloudy", "rain");
        map.set("Rain", "rain");
        map.set("Partially cloudy", "cloudy");
        map.set("Overcast", "overcast");
        map.set("Clear", "clear");
        return map;
    }

    _initScales() {
        const padding = 0.035;
        this._x = d3.scaleBand().domain(this._years).range([0, this._gridDims.width]).padding([padding]);
        this._y = d3.scaleBand().domain(this._days).range([0, this._gridDims.height]).padding([padding]);

        let ext = d3.extent(this._monthlyData.flatMap(d => [d.min, d.max])).reverse();
        this._tempY = d3.scaleLinear().domain(ext).range([0, this._elemDims.tempChart]).nice();

        if (this._options.tempScale === "month")
            ext = d3.extent(this._monthlyData.map(d => d.avg));
        else
            ext = d3.extent(this._data.map(d => d.avg));

        const sample = this._sample(ext, this._scheme.length + 1).reverse();
        this._tempSegs = this._scheme.map((d, i) => ({
            color: d,
            s: sample[i + 1],
            e: sample[i]
        }));

        const segs = this._tempSegs;
        this._c = t => {
            for (let i = 0; i < segs.length; i++) {
                if (t >= segs[i].s && t <= segs[i].e)
                    return segs[i].color;
            }
            return "#eee";
        }
    }

    _render() {
        const { w, h } = this._updateViewbox();

        this._renderStatistics(w);

        this._og = this._container.append("g")
            .attr("font-family", this._font.fontFamily)
            .attr("transform", `translate(0,${this._elemDims.statChart})`);

        this._addFilter();
        this._renderDateLabels();
        this._renderYearColumns();
        this._renderLegend();
        this._renderTempChart();        
    }

    // Weather grid renderer
    //
    _addFilter() {
        return this._og
            .append("defs")
            .append("filter")
            .attr("id", "shadow")
            .call(f => {                
                f
                    .append("feDropShadow")
                    .attr("dx", 0.5).attr("dy", 0.5)
                    .attr("flood-color", "#bbb")
                    .attr("stdDeviation", 0.5);
                
                f
                    .append("feColorMatrix")
                    .attr("values", "-1 0 0 0 1 0 -1 0 0 1 0 0 -1 0 1 0 0 0 1 0");
            });
    }

    _renderDateLabels() {
        return this._og
            .selectAll("date")
            .data(this._days)
            .join("g")
            .attr("class", "date")
            .attr("transform", d => `translate(${this._elemDims.legend},${this._y(d) + this._elemDims.tempChart + this._elemDims.partMargin + this._gridMargin.top})`)
            .call(g => {
                g
                    .append("rect")
                    .attr("width", this._elemDims.dayLabel)
                    .attr("height", this._y.bandwidth())
                    .attr("fill", "#eee");
                g
                    .append("text")
                    .attr("x", this._elemDims.dayLabel / 2)
                    .attr("y", this._y.bandwidth() / 2)
                    .attr("dy", "0.3em")
                    .attr("text-anchor", "middle")
                    .attr("fill", "#666")
                    .text(d => d);
            });
    }

    _renderYearColumns() {
        const
            that = this,
            colorIsTemp = this._options.cellColor === "temperature",
            colorIsHybrid = this._options.cellColor === "hybrid",
            b = this._x.bandwidth(), hb = b / 2, yb = this._y.bandwidth();

        const df = 250 / this._years.length;
        const cols = this._og.append("g")
            .attr("transform", `translate(${this._gridMargin.left},${this._elemDims.tempChart + this._elemDims.partMargin})`)
            .selectAll("year")
            .data(this._groupedData)
            .join("g")
            .attr("class", "year")
            .attr("transform", d => `translate(${this._x(d[0])},0)`)
            .call(drawTempLabel)
            .call(drawYearLabel)
            .call(drawCell);

        this._attachEvents(
            cols.selectAll(".cell"),
            d => [
                d.date.toLocaleDateString(),
                d.cond.capitalize(),
                this._formatTemp("High", d.max),
                this._formatTemp("Avg", d.avg),
                this._formatTemp("Low", d.min)
            ]
        );

        function drawTempLabel(g) {
            g
                .append("g")
                .attr("fill", d => that._c(d[1].avg))
                .call(ag => {
                    ag
                        .append("text")
                        .attr("x", hb)
                        .attr("y", 10)
                        .attr("dy", "0.3em")
                        .attr("text-anchor", "middle")
                        .attr("font-weight", "bold")
                        .text(d => d[1].avg.toFixed(0));
                    ag
                        .append("rect")
                        .attr("y", that._elemDims.avgLabel - 10)
                        .attr("width", b)
                        .attr("height", 8)
                });
        }

        function drawYearLabel(g) {
            g
                .append("rect")
                .attr("y", that._elemDims.avgLabel)
                .attr("width", b)
                .attr("height", that._elemDims.yearLabel)
                .attr("fill", "#eee");

            const ty = that._elemDims.yearLabel / 2 + that._elemDims.avgLabel;
            g
                .append("text")
                .attr("class", "yearLabel")
                .attr("x", hb)
                .attr("y", ty)
                .attr("text-anchor", "middle")
                .attr("dy", "0.3em")
                .attr("fill", "#666")
                .attr("transform", `rotate(-90,${hb},${ty})`)
                .text(d => d[0]);
        }

        function drawCell(g) {
            g
                .selectAll("cell")
                .data(d => d[1].data)
                .join("g")
                .attr("class", "cell")                
                .attr("transform", d => `translate(0, ${that._y(d.date.getDate()) + that._gridMargin.top})`)                
                .call(cell => {
                    cell
                        .append("rect")
                        .attr("x", 0).attr("y", 0)
                        .attr("width", b).attr("height", yb)
                        .attr("stroke", "#eee")
                        .attr("stroke-width", 0.1)
                        .attr("fill", d => {
                            return colorIsTemp ? that._c(d.avg) : that._condColors[d.cond].color;
                        });

                    if (colorIsHybrid) {
                        cell
                            .append("rect")
                            .attr("x", 0).attr("y", yb * .75)
                            .attr("width", b).attr("height", yb * .25)
                            .attr("stroke", "#eee")
                            .attr("stroke-width", 0.1)
                            .attr("fill", d => that._c(d.avg));
                    }

                    cell
                        .append("image")
                        .attr("width", that._iconSize)
                        .attr("height", that._iconSize)
                        .attr("x", that._cellPadding).attr("y", that._cellPadding)
                        .attr("href", d => that._condColors[d.cond].icon)
                        .style("filter", "url(#shadow)");
                });
        }
    }

    // Temperature Chart renderer
    //
    _renderTempChart() {
        const that = this;
        const gg = this._og.append("g")
            .attr("transform", `translate(${this._gridMargin.left},0)`);

        gg
            .append("g")            
            .call(g => {
                g
                    .append("rect")
                    .attr("width", this._gridDims.width)
                    .attr("height", this._elemDims.tempChart)
                    .attr("opacity", 1).attr("fill", "white");

                drawLine(g, this._elemColors.tempHigh, "max");
                drawLine(g, this._elemColors.tempLow, "min");
                drawLine(g, this._elemColors.tempAvg, "avg");
            })
            .call(g => {
                const
                    n = this._tempY.domain()[0],
                    m = this._tempY.domain()[1],
                    ticks = [n, Math.round((n + m) / 2), m];

                g
                    .append("g")
                    .attr("fill", "#ddd")
                    .attr("stroke-width", 0.5)
                    .attr("transform", `translate(${this._gridDims.width - this._x.bandwidth() / 2},0)`)
                    .call(d3.axisRight(this._tempY).tickValues(ticks))
                    .call(g => {
                        g.select(".domain").remove();
                        g.selectAll(".tick text").attr("fill", "#666");
                        g.selectAll(".tick line").attr("stroke-color", "#666");
                    })
            });

        this._drawConnector();
        this._drawTempIndicator(gg);

        function drawLine(g, color, prop) {
            g
                .append("path")
                .datum([...that._groupedData.values()])
                .attr("stroke", color)
                .attr("fill", "none")
                .attr("d", d => line(prop)(d));
        }

        function line(prop) {
            return d3.line()
                .defined(d => !isNaN(d[prop]))
                .x(d => that._x(d.year) + that._x.bandwidth() / 2)
                .y(d => that._tempY(d[prop]));
        }
    }

    _drawConnector() {
        const
            cx = this._gridMargin.left + this._x.bandwidth() / 2 - 10,
            cy = this._tempY(this._groupedData.values().next().value.avg);

        this._og
            .append("circle")
            .attr("cx", cx).attr("cy", cy).attr("r", 2.5)
            .attr("fill", this._elemColors.tempAvg);

        this._og
            .append("text")
            .attr("font-size", "8pt")
            .attr("text-anchor", "end")
            .attr("x", cx - 5).attr("y", cy)
            .attr("dy", "-0.5em")
            .attr("fill", this._elemColors.tempAvg)
            .text("Average");

        const ed = this._elemDims;
        this._og
            .append("path")
            .attr("d", `M ${cx} ${cy} H ${cx - 50} V ${ed.tempChart + ed.partMargin + 10} H ${cx - 10}`)
            .attr("fill", "none")
            .attr("stroke", this._elemColors.tempAvg)
            .attr("stroke-width", 1);
    }

    _drawTempIndicator(g) {
        const
            that = this,
            years = this._og.selectAll(".yearLabel");

        const line = g.append("g")
            .attr("opacity", 0)
            .attr("font-size", "9pt")
            .attr("font-weight", "bold");

        line.append("line")
            .attr("stroke", "#999")
            .attr("x1", 0).attr("y1", 0)
            .attr("x2", 0).attr("y2", this._elemDims.tempChart);

        const high = line.append("text")
            .attr("fill", this._elemColors.tempHigh)
            .attr("dy", "-1em")
            .attr("transform", `translate(5,${this._elemDims.tempChart})`);

        const low = line.append("text")
            .attr("fill", this._elemColors.tempLow)
            .attr("transform", `translate(5,${this._elemDims.tempChart})`);

        g
            .on("pointerenter", () => line.attr("opacity", 1))
            .on("pointermove", (e, d) => moveTempLine(e, d))
            .on("pointerleave", () => {
                line.attr("opacity", 0);
                years.attr("fill", "#666").attr("font-weight", "normal");
            });

        const
            weathers = [...that._groupedData.values()],
            b = this._x.bandwidth(), hb = b / 2, xr = this._x.range();

        function moveTempLine(e, d) {
            const
                converted = that._convertCoordinate(e, g),
                pos = converted.x;

            if (pos >= hb && pos <= xr[1] - hb) {
                const left = xr[0], right = xr[1];
                const index = d3.bisect(d3.range(left, right, b), pos - hb);

                const weather = weathers[index - 1];
                high.text(that._formatTemp("High", weather.max));
                low.text(that._formatTemp("Low", weather.min));

                const
                    hbox = high.node().getBBox(),
                    lbox = low.node().getBBox();
                const w = hbox.width > lbox.width ? hbox.width : lbox.width;
                const tx = pos + w > right ? -w : 5;
                high.attr("transform", `translate(${tx},${that._elemDims.tempChart})`);
                low.attr("transform", `translate(${tx},${that._elemDims.tempChart})`);

                line.attr("transform", `translate(${pos},0)`);
                years
                    .attr("fill", (d, i) => i === index - 1 ? "black" : "#666")
                    .attr("font-weight", (d, i) => i === index - 1 ? "bold" : "normal");
            }
        }
        return line;
    }

    // Legend renderer
    //
    _renderLegend() {
        const w = 20;

        return this._og
            .append("g")
            .selectAll("g")
            .data(this._tempSegs)
            .join("g")
            .attr("font-size", "10pt")
            .attr("transform", (d, i) => `translate(0,${i * (w + 5)})`)
            .call(g => {
                g
                    .append("rect")
                    .attr("width", w).attr("height", w)
                    .attr("fill", d => d.color);
                g
                    .append("line")
                    .attr("x1", 0).attr("x2", (d, i) => i === 0 ? 70 : 45)
                    .attr("y1", w).attr("y2", w)
                    .attr("stroke", "#666")
                    .attr("stroke-width", 0.5)
                    .attr("stroke-dasharray", "1");
                g
                    .append("text")
                    .attr("x", w + 10)
                    .attr("dy", "18")
                    .attr("fill", "#666")
                    .text((d, i) => {
                        if (i === 0) {
                            return `> ${d.s}°F`;
                        }
                        else {
                            return `${d.s}`;
                        }                        
                    }

                        
                    );
            });
    }

    // Statistics renderer
    //
    _renderStatistics(width) {
        const
            margin = 10,
            w = (width - margin * 2) / 2;
        const g = this._container
            .append("g")
            .attr("fill", "#666")
            .attr("font-family", this._font.fontFamily)
            .attr("transform", `translate(${margin},0)`);

        this._renderTempStatistic(g, w);
        this._renderCondStatistic(g, w + margin, w);
    }

    _renderTempStatistic(g, width) {
        const counts = d3.rollup(this._monthlyData.map(d => this._c(d.avg)), v => v.length, d => d);

        let v = 0;
        const data = [...this._scheme]
            .filter(d => counts.get(d) !== undefined)
            .reverse()
            .map((d, i) => {
                const
                    days = counts.get(d),
                    pct = days / this._monthlyData.length;

                return {
                    color: d,
                    days: days,
                    pct: pct,
                    s: v,
                    e: v += days
                }
            });

        this._renderStatistic(g, data, `${this._months[this._month]} average temperature`, 0, width);
    }

    _renderCondStatistic(g, left, width) {
        const counts = d3.rollup(this._monthlyData.map(d => d.cond), v => v.length, d => d);

        let v = 0;
        const data = Object.keys(this._condColors)
            .filter(k => counts.get(k) !== undefined)
            .map(k => {
                const
                    days = counts.get(k),
                    pct = days / this._monthlyData.length,
                    cond = this._condColors[k];

                return {
                    color: cond.color,
                    icon: cond.icon,
                    days: days,
                    pct: pct,
                    s: v,
                    e: v += days
                }
            });

        const iconSize = 14;
        this._renderStatistic(
            g, data, "Weather condition", left, width,
            (g, x) => {
                g
                .append("image")
                .attr("x", d => x(d.s) + (x(d.e) - x(d.s) - iconSize) / 2 + left)
                .attr("y", 50)
                .attr("width", iconSize).attr("height", iconSize)
                .attr("opacity", 0.65)
                .attr("href", d => d.icon);
            }
        );
    }

    _renderStatistic(g, data, caption, left, width, addition) {
        const x = d3.scaleLinear().domain([data[0].s, data[data.length - 1].e]).range([0, width]);

        g
            .append("text")
            .attr("x", left)
            .attr("dy", "1em")
            .attr("font-size", "10pt")
            .text(caption);

        g
            .append("text")
            .attr("x", left + width)
            .attr("dy", "1.5em")
            .attr("text-anchor", "end")
            .attr("font-size", "8pt")
            .text("%");

        g
            .append("line")
            .attr("x1", left).attr("x2", left + width)
            .attr("y1", 20).attr("y2", 20)
            .attr("stroke", "#666")
            .attr("stroke-width", 0.25)
            .attr("stroke-dasharray", "1");


        const stats = g
            .append("g")
            .attr("transform", "translate(0, 20)")
            .selectAll("g")
            .data(data)
            .join("g")
            .attr("text-anchor", "middle")
            .attr("font-size", "9pt")
            .call(g => {
                g
                    .append("text")
                    .attr("x", d => x(d.s) + (x(d.e) - x(d.s)) / 2 + left)
                    .attr("dy", "1em")
                    .text((d, i) => {
                        const p = d.pct * 100;
                        return p > 1 ? p.toFixed(0) : "";
                    });
                g
                    .append("rect")
                    .attr("x", d => x(d.s) + left)
                    .attr("y", 15)
                    .attr("width", d => x(d.e) - x(d.s))
                    .attr("height", 30)
                    .attr("fill", d => d.color);

                if (addition) addition(g, x);
            });

        this._attachEvents(
            stats,
            d => [
                `${d.days} days`,
                `${(d.pct * 100).toFixed(1)}%`
            ]
        );
    }

    _calcTooltipPosition(converted, box) {        
        const mapped = {
            x: converted.x - this._elemDims.legend,
            y: converted.y - this._elemDims.statChart - this._elemDims.tempChart
        };

        const
            left = mapped.x + box.width > this._gridDims.width ? converted.x - box.width : converted.x,            
            top = mapped.y + box.height > this._gridDims.height ? converted.y - box.height : converted.y;
        return { left, top };
    }

    // Utilities
    //
    _sample(extent, n) {
        const
            min = Math.floor(extent[0]),
            max = Math.ceil(extent[1]),
            step = (max - min) / (n - 1);

        const s = [];
        for (let i = min; i < max; i += step) {
            s.push(Math.ceil(i));
        }
        if (s[s.length - 1] != max) s.push(max);
        return s;
    }

    _formatTemp(caption, v) {
        return `${caption}: ${v}${this._options.tempUnit}`;
    }
}