import React from "react";
import request from "superagent";

import { Input, ListGroup, ListGroupItem } from "react-bootstrap";

class CurrencyLink {
  constructor(childNode, ratio) {
    this.childNode = childNode;
    this.ratio = ratio;
  }
}

class CurrencyNode {
  constructor(currName) {
    this.currName = currName;
    this.children = [];
  }
}

var CurrencyNode = function(currName) {
  this.currName = currName;
};

CurrencyNode.prototype.getCurrName = function() {
  return this.currName;
}

// Immutable.
class CurrencyPath {
  constructor(startCurr, visited, links) {
    this.startCurr = startCurr;

    if (visited) {
      this.visited = new Set(visited);
    } else {
      this.visited = new Set();
    }

    if (links) {
      this.links = links.slice();
    } else {
      this.links = [];
    }
  }

  addLink(link) {
    var result = new CurrencyPath(this.startCurr, this.visited, this.links);
    result.links.push(link);
    result.visited.add(link.childNode.currName);
    return result;
  }

  // I'm not using properties and am instead using explict functions to
  // highlight the fact that these take a relatively long time to run.
  getOverallRatio() {
    var result = 1.0; // Even though all JavaScript numbers are doubles, better to be explicit.
    for (var link of this.links) {
      result *= link.ratio;
    }
    return result;
  }

  toString() {
    var otherCurrs = this.links.map((link) => {return link.childNode.currName;});
    var result = "Multiplier: " + this.getOverallRatio() + " Path: " + this.startCurr + ", "
      + otherCurrs.join(", ");
    return result;
  }
}

class CurrencyGraph {
  constructor() {
    this.nodes = new Map();
  }

  // Hopefully don't run out of memory due to generator.
  *getAllCycles(startCurr) {
    var node = this.nodes.get(startCurr);

    // Since this is an NP-Complete algorithm, stack overflow shouldn't be an issue
    // compared to the number of computations performed.
    function *helper(currentLink, currentPath) {
      var curr = currentLink.childNode.currName;
      if (curr === startCurr) {
        yield currentPath.addLink(currentLink);
      } else if (!currentPath.visited.has(curr)) {

        var newPath = currentPath.addLink(currentLink);
        for (var link of currentLink.childNode.children) {
          yield* helper(link, newPath);
        }
      }
    }

    var startPath = new CurrencyPath(startCurr);
    for (var link of node.children) {
      yield* helper(link, startPath);
    }
  }

  // A good cycle is one in which the overall ratio is > 1.
  *getGoodCycles(startCurr, lookAt) {
    for (var path of this.getAllCycles(startCurr)) {
      if (path.getOverallRatio() > 1.0001) {
        yield path;
      }

      lookAt--;
      if (lookAt <= 0) {
        break;
      }
    }
  }

  addLink(parentCurr, childCurr, ratio) {
    var result = new CurrencyLink(this.nodes.get(childCurr), ratio);
    var parent = this.nodes.get(parentCurr);
    parent.children.push(result);
  }

  addNode(currency) {
    if (!this.nodes.has(currency)) {
      var result = new CurrencyNode(currency);
      this.nodes.set(currency, result);
    }
  }
}

class CurrencyResult extends React.Component {
  static displayName = "CurrencyResult";
  static propTypes = {date: React.PropTypes.string.isRequired};

  constructor(props) {
    super(props);
    this.state = {date: props.date, bestPaths: []};
    this.computeNewPaths(props.date);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({date: nextProps.date, bestPaths: []});
    this.computeNewPaths(nextProps.date);
  }

  computeNewPaths(newDate) {
    request.get("/curr/" + newDate)
      .set("Content-Type", "application/json")
      .end((err, res) => {
        if (err) {
          console.log(err);
          return;
        }

        var date = res.date;
        var graph = new CurrencyGraph();
        res = JSON.parse(res.text);
        for(var rate of res.exchangeRates) {
          graph.addNode(rate.currency1);
          graph.addNode(rate.currency2);
          graph.addLink(rate.currency1, rate.currency2, rate.oneToTwo);
        }

        var paths = Array.from(graph.getGoodCycles('USD', 10000));
        this.setState({date: date, bestPaths: paths});
      });
  }

  render() {
    return (
        <div>
          <h4>Best Trades</h4>
          <ListGroup>
            {this.state.bestPaths.map(function(path) {
              return (<ListGroupItem>{path.toString()}</ListGroupItem>);
            })}
          </ListGroup>
        </div>
    );
  }

}

export default class Currency extends React.Component {
  static displayName = "Currency";
  static propTypes = {};
  static defaultProps = {};

  constructor(props) {
    super(props);
    this.state = {dates: [], selectedDate: null};
  }

  componentWillMount() {
    request.get("/currDates")
      .set("Content-Type", "application/json")
      .end((err, res) => {
        if (err) {
          console.log(err);
          return;
        }

        var dates = res.body;
        dates.sort();
        dates.reverse();
        this.setState({"dates": dates, selectedDate: dates[0]});
      });
  }

  selectedDate(value) {
    this.setState({dates: this.state.dates, selectedDate: this.refs.dateInput.getValue()});
  }

  render() {
    var currResult;
    if (this.state.selectedDate) {
      currResult = (
        <div className="currencyResult">
          <CurrencyResult date={this.state.selectedDate}></CurrencyResult>
        </div>
      );
    } else {
      currResult = (<div className="currencyResult"></div>);
    }

    return (
      <div>
        <h3>Currency Trading Analyzer</h3>
        <div className="currency">
          <form>
            <Input type="select" ref="dateInput" placeholder="select" label="Trading Day" onChange={this.selectedDate.bind(this)}>
              {this.state.dates.map(function(date) {
                return (<option value={date}>{date}</option>);
              })}
            </Input>
          </form>
        </div>
        {currResult}

      </div>
    );
  }
}
