import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { ElementSelectors, TriggerType } from '@mini-apty/shared';

export class WalkthroughStep extends Model {
  declare id: string;
  declare walkthroughId: string;
  declare stepNumber: number;
  declare title: string;
  declare description: string;
  declare selectors: ElementSelectors;
  declare triggerType: TriggerType;
  declare triggerValue?: string;
  declare path?: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

WalkthroughStep.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    walkthroughId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    stepNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    selectors: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    triggerType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'next-button',
    },
    triggerValue: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    path: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'WalkthroughStep',
    tableName: 'walkthrough_steps',
    timestamps: true,
  }
);
