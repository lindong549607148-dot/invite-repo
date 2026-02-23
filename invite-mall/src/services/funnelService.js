const counters = {
  product_click: 0,
  order_submit: 0,
  pay_success: 0,
  share_initiated: 0,
  helper_bind_success: 0,
};

function incr(event) {
  if (!event || !Object.prototype.hasOwnProperty.call(counters, event)) return;
  counters[event] += 1;
}

function getSummary() {
  const productClick = counters.product_click || 0;
  const orderSubmit = counters.order_submit || 0;
  const paySuccess = counters.pay_success || 0;
  const submitRate = productClick ? orderSubmit / productClick : 0;
  const payRate = orderSubmit ? paySuccess / orderSubmit : 0;
  return {
    product_click: productClick,
    order_submit: orderSubmit,
    pay_success: paySuccess,
    share_initiated: counters.share_initiated || 0,
    helper_bind_success: counters.helper_bind_success || 0,
    conversion: {
      submitRate,
      payRate,
    },
  };
}

module.exports = { incr, getSummary };
