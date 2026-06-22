import { User } from './user.js';
import { Walkthrough } from './walkthrough.js';
import { WalkthroughStep } from './step.js';
import { sequelize } from '../config/database.js';

User.hasMany(Walkthrough, {
  foreignKey: 'userId',
  as: 'walkthroughs',
  onDelete: 'CASCADE',
});
Walkthrough.belongsTo(User, {
  foreignKey: 'userId',
});

Walkthrough.hasMany(WalkthroughStep, {
  foreignKey: 'walkthroughId',
  as: 'steps',
  onDelete: 'CASCADE',
});
WalkthroughStep.belongsTo(Walkthrough, {
  foreignKey: 'walkthroughId',
});

export { User, Walkthrough, WalkthroughStep, sequelize };
export default { User, Walkthrough, WalkthroughStep, sequelize };
