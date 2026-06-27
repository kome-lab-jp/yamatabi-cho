'use strict';

const Calculator = {
  compute(data) {
    const members  = parseInt(data.members)  || 1;
    const distance = parseFloat(data.distance) || 0;
    const costPerKm = parseFloat(data.costPerKm) || 10;
    const highway  = parseFloat(data.highway)  || 0;
    const fuelPrice = parseFloat(data.fuelPrice) || 170;
    const fuelEff  = parseFloat(data.fuelEff)  || 15;
    const parking  = parseFloat(data.parking)  || 0;
    const tentPerPerson = parseFloat(data.tentPerPerson) || 0;
    const other    = parseFloat(data.other)    || 0;

    const carCost  = Math.round(distance * costPerKm);
    const fuelCost = fuelEff > 0 ? Math.round((distance / fuelEff) * fuelPrice) : 0;
    const tentTotal = Math.round(tentPerPerson * members);
    const total    = carCost + highway + fuelCost + parking + tentTotal + other;
    const perPerson = members > 0 ? Math.round(total / members) : 0;

    return { carCost, fuelCost, tentTotal, total, perPerson };
  },

  format(n) {
    return n.toLocaleString('ja-JP');
  }
};
