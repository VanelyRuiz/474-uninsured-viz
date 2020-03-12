(function () {

    'use strict'

    const margin = { top: 50, right: 50, bottom: 50, left: 50 }
        , width = 800 - margin.left - margin.right
        , height = 600 - margin.top - margin.bottom

    var svg, tooltip, xLabels, line, dataG, countryLimits, currentState, xScale, yScale

    d3.csv('./data/ACSDT5Y2018.B27015_data_with_overlays.csv').then((data) => {
        dataG = data
        dataG.splice(0, 1) // removes the variable names

        // get list of states 
        let states = []
        dataG.filter(d => states.push(d['NAME']))
        states.sort() // sorts states alphabetically 

        countryLimits = getCountryLimits()

        xLabels =
            ['Under $25k',
                '$25k - $49k',
                '$50k - $74k',
                '$75k - $99k',
                '$100k +']

        var selectDiv = d3.select('body')
            .append('div')
            .attr('id', 'filter')

        var select = d3.select('div')
            .append('select')
            .on('change', function () {
                updateChart(this.value)
            })

        var options = select
            .selectAll('option')
            .data(states)
            .enter()
            .append('option')
            .text(function (d) { return d })

        // div for the tooltip
        tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0)

        // svg for the chart
        svg = d3.select('body')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)// global data variable

        drawChart('Alabama')
    })

    function getCountryLimits() {
        let populations = []

        let incomeBrackets = {
            'under25': [],
            '25to50': [],
            '50to75': [],
            '75to100': [],
            '100up': []
        }

        let uninsured = []

        let uninsuredPerecentage = []

        // for each state
        dataG.forEach(d => {
            let pop = parseInt(d['B27015_001E'])
            populations.push(parseInt(d['B27015_001E']))                // population
            incomeBrackets['under25'].push(parseInt(d['B27015_006E']))  // under $25,000
            incomeBrackets['25to50'].push(parseInt(d['B27015_011E']))   // $25,000 - $49,999
            incomeBrackets['50to75'].push(parseInt(d['B27015_016E']))   // $50,000 - $74,999
            incomeBrackets['75to100'].push(parseInt(d['B27015_021E']))  // $75,000 - $99,999
            incomeBrackets['100up'].push(parseInt(d['B27015_026E']))    // over $100,000

            uninsured.push(parseInt(d['B27015_006E']))      // under $25,000
            uninsured.push(parseInt(d['B27015_011E']))      // $25,000 - $49,999
            uninsured.push(parseInt(d['B27015_016E']))      // $50,000 - $74,999
            uninsured.push(parseInt(d['B27015_021E']))      // $75,000 - $99,999
            uninsured.push(parseInt(d['B27015_026E']))      // over $100,000

            uninsuredPerecentage.push(parseInt(d['B27015_006E']) / pop * 100)      // under $25,000
            uninsuredPerecentage.push(parseInt(d['B27015_011E']) / pop * 100)      // $25,000 - $49,999
            uninsuredPerecentage.push(parseInt(d['B27015_016E']) / pop * 100)      // $50,000 - $74,999
            uninsuredPerecentage.push(parseInt(d['B27015_021E']) / pop * 100)      // $75,000 - $99,999
            uninsuredPerecentage.push(parseInt(d['B27015_026E']) / pop * 100)      // over $100,000
        })

        let populationLimits = {
            min: d3.min(populations),
            max: d3.max(populations)
        }

        let uninsuredLimits = {
            min: d3.min(uninsured),
            max: d3.max(uninsured)
        }

        let uninsuredPercentageLimits = {
            min: d3.min(uninsuredPerecentage),
            max: d3.max(uninsuredPerecentage)
        }

        let countryLimits = {
            population: populationLimits,
            income_brackets: incomeBrackets,
            uninsured: uninsuredLimits,
            uninsured_percentage: uninsuredPercentageLimits
        }
        return countryLimits
    }

    // draws the initial chart, with Alabama as the state
    function drawChart(state) {
        d3.selectAll('.axes').remove() // removes x & y axes to aviod duplication 

        xScale = d3.scaleBand()
            .domain(xLabels)
            .range([margin.right, width])

        yScale = d3.scaleLinear()
            .domain([countryLimits.uninsured_percentage.min, countryLimits.uninsured_percentage.max])
            .range([height, 0])

        // make x axis
        const xAxis = svg.append('g')
            .attr('class', 'axes')
            .attr('transform', 'translate(' + margin.left + ',' + height + ')')
            .call(d3.axisBottom(xScale))

        // make y axis
        const yAxis = svg.append('g')
            .attr('class', 'axes')
            .attr('transform', 'translate(' + (margin.left + margin.right) + ', 0)')
            .call(d3.axisLeft(yScale))

        // d3's line generator
        line = d3.line()
            .x(d => xScale(d['x'])) // set the x values for the line generator 
            .y(d => yScale(d['y'])) // set the y values for the line generator 

        let stateData = getStateData(state)

        currentState = stateData

        let chartData = toJson(xLabels, stateData.uninsured_percentage)
        // append line to svg
        svg.append('path')
            .datum(chartData)
            .attr('d', line)
            .attr('class', 'line')
            .attr('transform', 'translate(120,0)')

        // append dots to svg to track data points
        svg.selectAll('.dot')
            .data(chartData)
            .enter()
            .append('circle')
            .attr('cx', d => xScale(d['x']))
            .attr('cy', d => yScale(d['y']))
            .attr('transform', 'translate(120,0)')
            .attr('class', 'dot')
            .attr('r', 2.7)
            .on('mouseover', function (d) {
                tooltip.transition()
                    .duration(600)
                    .style('opacity', 0.9)
                    .style('left', d3.event.pageX + 'px')
                    .style('top', (d3.event.pageY - 80) + 'px')

                let index = currentState['uninsured_percentage'].indexOf(d.y)
                // add the tooltip text
                tooltip.append('div')
                    .attr('id', 'tooltipTitle')
                    .attr('class', 'tooltipText')
                    .text('No Healthcare Coverage')
                
                // state population
                tooltip.append('div')
                    .attr('class', 'tooltipText')
                    .attr('id', 'tooltipStatePop')
                    .text('State Population: ' + new Intl.NumberFormat().format(currentState.population))
                
                // income bracket population
                tooltip.append('div')
                    .attr('class', 'tooltipText')
                    .attr('id', 'tooltipPopulation')
                    .text('Count: ' + new Intl.NumberFormat().format(currentState['uninsured_population'][index]))
                
                // income bracket percentage
                tooltip.append('div')
                    .attr('id', 'percentage')
                    .attr('class', 'tooltipText')
                    .text('Percentage:  ' + d.y.toFixed(3) + '%')
            })
            .on('mouseout', function (d) {
                tooltip.transition()
                    .duration(600)
                    .style('opacity', 0)
                tooltip.html("") // clears the div
            })
        addAxesLabels('Income Bracket', 'Percentage of State Population Uninsured')
    }

    // updates the chart, data is new selection 
    function updateChart(state) {
        let stateData = getStateData(state)
        currentState = stateData
        let newState = toJson(xLabels, stateData.uninsured_percentage)

        var stateLine = svg.selectAll('.line')
        stateLine
            .datum(newState)
            .transition()
            .duration(750)
            .attr("d", line)

        var stateDots = svg.selectAll('.dot')
        stateDots
            .data(newState)
            .transition()
            .duration(750)
            .attr('cx', d => xScale(d['x']))
            .attr('cy', d => yScale(d['y']))

    }

    // returns json data of x and y values 
    function toJson(xValues, yValues) {
        //create json data for graph
        let jsonStr = '[';
        for (let i = 0; i < 5; i++) {
            jsonStr += `{"y":` + yValues[i] + `,"x":"` + xValues[i] + `"},`
        }
        jsonStr = jsonStr.substr(0, jsonStr.length - 1)
        jsonStr += ']'

        let data = JSON.parse(jsonStr)

        return data
    }

    // returns the percentage of uninsured people in each income bracket
    function getStateData(state) {
        let rawStateData = dataG.filter(d => d['NAME'] == state)[0]
        let population = rawStateData['B27015_001E'] // get population for state
        let uninsuredPopulation = getUninsuredPopulation(rawStateData)
        let uninsuredPerecentage = getPercentage(uninsuredPopulation, population)

        let stateData = {
            population: population,
            uninsured_population: uninsuredPopulation,
            uninsured_percentage: uninsuredPerecentage
        }
        return stateData
    }

    function getUninsuredPopulation(rawStateData) {
        let uninsuredPopulation = []
        uninsuredPopulation.push(parseInt(rawStateData['B27015_006E']))  // under $25,000
        uninsuredPopulation.push(parseInt(rawStateData['B27015_011E']))  // $25,000 - $49,999
        uninsuredPopulation.push(parseInt(rawStateData['B27015_016E']))  // $50,000 - $74,999
        uninsuredPopulation.push(parseInt(rawStateData['B27015_021E']))  // $75,000 - $99,999
        uninsuredPopulation.push(parseInt(rawStateData['B27015_026E']))  // over $100,000
        return uninsuredPopulation
    }


    // returns the percentage the subpopulation is of the population 
    function getPercentage(subpopulation, population) {
        let percentage = []
        subpopulation.forEach(element => {
            percentage.push((element / population) * 100)
        })
        return percentage
    }

    // Add labels along the x and y axes
    function addAxesLabels(x, y) {
        svg.append("text")
            .attr('class', 'label')
            .attr("x", - height / 2)
            .attr("y", margin.bottom / 2) // along x axis because rotated
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .text(y);

        svg.append("text")
            .attr('class', 'label')
            .attr("x", width / 2 + margin.bottom)
            .attr("y", height + margin.bottom )
            .attr("text-anchor", "middle")
            .text(x);
    }
})()