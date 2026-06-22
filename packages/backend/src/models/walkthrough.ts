import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Walkthrough extends Model {
  declare id: string;
  declare userId: string;
  declare name: string;
  declare origin: string;
  declare path: string;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Walkthrough.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    origin: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    path: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: '/',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'Walkthrough',
    tableName: 'walkthroughs',
    timestamps: true,
    indexes: [
      {
        fields: ['origin', 'path'],
      },
    ],
  }
);
