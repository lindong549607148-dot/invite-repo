const express = require('express');
const cors = require('cors');
const config = require('./config');
const requestId = require('./middlewares/requestId');
const errorHandler = require('./middlewares/errorHandler');
const auth = require('./middlewares/auth');
const adminAuth = require('./middlewares/adminAuth');
const { startSchedulers } = require('./schedulers');
const { store } = require('./store/memory');
const orderService = require('./services/orderService');
const healthRouter = require('./routes/health');
const usersRouter = require('./routes/users');
const ordersRouter = require('./routes/orders');
const payRouter = require('./routes/pay');
const tasksRouter = require('./routes/tasks');
const quotaRouter = require('./routes/quota');
const adminRouter = require('./routes/admin');
const dashboardRouter = require('./routes/dashboard');
const productsRouter = require('./routes/products');
const adminFeatureFlagsRouter = require('./routes/adminFeatureFlags');
const adminProductsRouter = require('./routes/adminProducts');
const adminRiskRouter = require('./routes/adminRisk');

const app = express();

app.use(requestId);
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const id = req.requestId || '-';
  console.log(`[${id}] ${req.method} ${req.path}`);
  next();
});

app.use('/health', healthRouter);
app.use('/api/users', usersRouter);
app.use('/api/orders', auth, ordersRouter);
app.use('/api/pay', auth, payRouter);
app.use('/api/tasks', auth, tasksRouter);
app.use('/api/quota', auth, quotaRouter);
app.use('/api/admin', adminAuth, adminRouter);
app.use('/api/dashboard', adminAuth, dashboardRouter);
app.use('/api/admin/feature-flags', adminAuth, adminFeatureFlagsRouter);
app.use('/api/admin', adminAuth, adminProductsRouter);
app.use('/api/admin/risk', adminAuth, adminRiskRouter);
app.use('/api/products', productsRouter);

app.use(errorHandler);

// 测试环境不启动调度器与端口，便于 supertest 直接挂载 app
if (process.env.NODE_ENV !== 'test') {
  startSchedulers({
    store,
    services: { orderService },
    config,
    logger: console,
  });
  app.listen(config.port, () => {
    console.log(`Listening on http://localhost:${config.port}`);
  });
}

module.exports = app;
