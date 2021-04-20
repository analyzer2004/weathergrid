# Weather Grid


The **WeatherGrid** renders historical weather data into a beautiful and interactive Infographic.

For live demos and sample codes, please see [What story do two decades of weather data tell you?](https://observablehq.com/@analyzer2004/weather-grid)

<img src="https://github.com/analyzer2004/weathergrid/blob/master/images/cover.png" width="768">

## API Reference
The **WeatherGrid** renders historical weather data into a beautiful and interactive Infographic.
* **WeatherGrid(container)** - Constructs a new WeatherGrid with default settings. The container can be a svg or any g element.
* **options(options)** - Overrides the default settings and returns this chart.
  * options.**tempUnit** - sets the unit of temperature. Default is ***"°F"***.
  * options.**tempScale** - sets the scale of temperature to *"month"* or *"year"*. Default is ***"month"***.
  * options.**cellColor** - specifies the cell color to represent *"temperature"*, *"condition"* or *"hybrid"*. Default is ***"temperature"***.
  * options.**dateFormat** - sets the format (d3.parseTime) for parsing dates.  Default is ***"%m/%d/%Y"***.
* **font(font)** - Overrides the default font settings and returns this chart.
  * font.**fontFamily** - sets the font. Default is ***"Times New Roman"***.
  * font.**size** -
      * size.**statistic** - sets the font size of labels in statistic charts. Default is ***9***.
      * size.**legend** - sets the font size of legend. Default is ***10***.
      * size.**gridLabel** - sets the font size of grid labels. Default is ***12***.
* **tooltip(tooltip)** - Overrides the tooltip settings and returns this chart.
  * tooltip.**color** - sets the text color of tooltip.
  * tooltip.**boxColor** - sets the background color of the tooltip box.
  * tooltip.**boxOpacity** - sets the opacity of the tooltip box. Default is ***0.8***.
* **icon(icon)** - Sets the icon for each weather condition and returns this chart.
  * icon.**clear** - the url of clear icon
  * icon.**cloudy** - the url of cloudy icon
  * icon.**overcast** - the url of overcast icon
  * icon.**rain** - the url of rain icon
  * icon.**snow** - the url of snow icon
* **column(column)** - Sets the column names for parsing weather data and returns this chart.
  * column.**date** - the column name of date. Default is ***"date"***.
  * column.**low** - the column name of low temperature. Default is ***"min"***.
  * column.**high** - the column name of high temperature. Default is ***"max"***.
  * column.**avg** - the column name of average temperature. Default is ***"avg"***.
* **month(_)** - sets the current month and return this chart. Default is ***0*** (January).
* **data(_)** - Sets the historical weather data and return this chart.
* **render()** - Renders the visualization and returns this chart.
* **onhover(date)** - Occurs when mouse hovers over a cell.
* **onclick(date)** - Occurs when mouse clicks over a cell.