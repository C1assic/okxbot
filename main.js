const ccxt = require('ccxt')

const exchange = new ccxt.okx ({
  'apiKey': '', //ключ должен быть с доступом к торговле
  'secret': '',
  'password': '',
  'options': {'defaultType': 'swap'}
})

const tokenPrice = 0.1001946 //Текущая цена KIT
const amount = 100 //Сумма в китах которую хотим заплатить за страховку

const symbol = 'BTC/USDT:USDT' //Пара
const leverage = 70 //Плечо
const percentageOfBalance = 0.7 //Максимально допустимый % от баланса в качестве маржи позиции 
const mgnMode = 'cross' //Тип маржи
const side = 'buy' //buy/sell (У OKX 2типа позиции, нам нужен Net)

const tp = 1.2 //тут всё понятно, я думал
const sl = -0.5 //тут тоже

const main = async () => {
  await exchange.loadMarkets() //занимает много времени, до 

  const tradingBalance = await exchange.fetchFreeBalance ({ 'type': 'trading' })
  const market = await exchange.market(symbol)
  const ticker = await exchange.fetchTicker(symbol)
  const avaibleSum = tradingBalance['USDT'] * percentageOfBalance
  const tradingSum = amount * tokenPrice
  const tradingVolume = tradingSum * leverage
  
  console.log ('Баланс:', tradingBalance['USDT'])
  console.log ('Доступная сумма:', tradingSum)
  console.log ('Сумма ставки:', tradingSum)
  console.log ('Объем ставки:', tradingVolume)

  if(tradingSum > avaibleSum) {
    console.log('Не хватает денег')
    return
  }

  if(leverage > market.limits.leverage.max) {
    console.log('Плечо не должно быть больше: ', market.limits.leverage.max)
    return
  }

  await exchange.setLeverage(leverage, symbol, {mgnMode})

  const price = side == 'buy' ? ticker.bid : ticker.ask

  let tpPrice = 0, slPrice = 0

  if(side == 'buy'){
    tpPrice = price*(1.0+tp/leverage)
    slPrice = price*(1.0+sl/leverage)
  }else{
    tpPrice = price*(1.0-tp/leverage)
    slPrice = price*(1.0-sl/leverage)
  }

  let contracts = tradingVolume / (market.contractSize * price)
  contracts = Math.max(contracts, market.limits.amount.min)
  contracts = Math.floor(contracts)
  console.log ('Кол-во контрактов:', contracts)

  console.log ('Stop loss:', slPrice)
  console.log ('Take profit:', tpPrice)

  const params = {
    tdMode: mgnMode,
  }

  const order = await exchange.createOrder (symbol, 'market', side, contracts, undefined, params)
  const tpSlOrder = await exchange.createOrder (symbol, 'market', side == 'buy' ? 'sell' : 'buy', contracts, undefined, {...params, stopLossPrice: slPrice, takeProfitPrice: tpPrice, reduceOnly: true})

  console.log ('ID ордера:', order.clientOrderId)
  console.log ('ID TP-SL ордера:', tpSlOrder.clientOrderId)
}

main()