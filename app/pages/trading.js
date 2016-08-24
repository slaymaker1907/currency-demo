import React from "react";
import Currency from "../components/currency";

export default class Trading extends React.Component {
  static displayName = "TradingPage";
  constructor() {
    super();
  }

  render() {
    return (
      <div>
        <h2>Trading - Analysis Tools</h2>
        <Currency />
      </div>
    );
  }
}
