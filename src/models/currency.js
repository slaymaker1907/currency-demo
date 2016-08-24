"use strict";
var mongoose = require("mongoose");

var CurrencySchema = new mongoose.Schema({
  date: {type: Date, default: Date.now, index: true},
  exchangeRates: [{currency1: String, currency2: String, oneToTwo: Number}]
});

mongoose.model("Currency", CurrencySchema);
