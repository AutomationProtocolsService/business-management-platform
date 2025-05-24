import express from 'express';
import surveysRouter from './surveys';
import installationsRouter from './installations';

const configureRoutes = (app: express.Express) => {
  // Mount the survey routes
  app.use('/api/surveys', surveysRouter);
  
  // Mount the installation routes
  app.use('/api/installations', installationsRouter);
};

export default configureRoutes;