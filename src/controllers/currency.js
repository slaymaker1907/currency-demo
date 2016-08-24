"use strict";
var mongoose = require("mongoose");
var Currency = mongoose.model("Currency");

exports.recordCurrency = function *(){
  var body = this.request.body;
  if (!body) {
    this.throw("The body is empty", 400);
  }

  if (!body.exchangeRates) {
    this.throw("Missing exchangeRates.", 400);
  }

  try {
    var curr = new Currency({date:body.date, exchangeRates:body.exchangeRates});
    curr = yield curr.save();
  } catch(err) {
    this.throw(err);
  }

  this.status = 201;
  // Just send the date
  this.body = {'date': curr.date};
};

exports.getCurrencyDates = function *(){
  var dates = yield Currency.distinct('date').exec();
  if (!dates){
    this.throw('Database returned null for all dates.', 500);
  } else {
    this.status = 200;
    this.body = dates;
  }
};

exports.getCurrency = function *(){
  var dateRequested = this.params.date;
  var queryParams;
  if (dateRequested) {
    // Return the latest date before the input date.
    queryParams = {date: {$lte: dateRequested}};
  } else {
    // If date is null, then return most recent data.
    queryParams = {};
  }

  var result = yield Currency.find(queryParams)
    .sort('-date')
    .limit(1)
    .select("date exchangeRates")
    .exec();

  if (!result) {
    this.throw('Currency record list was null.', 500);
  }
  else if (result.length == 0){
    this.status = 404;
  } else if (result.length == 1) {
    this.status = 200;
    this.body = result[0];
  } else {
    this.throw('Retrieved too many currency records.', 500);
  }
};
