import { Walkthrough, WalkthroughStep, sequelize } from '../models/index.js';

export class WalkthroughService {
  static async createWalkthrough(userId: string, data: {
    name: string;
    origin: string;
    path: string;
    steps: any[];
    isActive?: boolean;
  }) {
    const t = await sequelize.transaction();
    try {
      const { name, origin, path, steps, isActive = true } = data;

      const walkthrough = await Walkthrough.create(
        {
          userId,
          name,
          origin,
          path,
          isActive,
        },
        { transaction: t }
      );

      const stepsToCreate = (steps || []).map((step: any) => ({
        walkthroughId: walkthrough.id,
        stepNumber: step.stepNumber,
        title: step.title,
        description: step.description,
        selectors: step.selectors,
        triggerType: step.triggerType,
        triggerValue: step.triggerValue,
        path: step.path,
      }));

      await WalkthroughStep.bulkCreate(stepsToCreate, { transaction: t });

      await t.commit();

      const result = await Walkthrough.findByPk(walkthrough.id, {
        include: [{ model: WalkthroughStep, as: 'steps' }],
      });

      return result;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  static async getWalkthroughs(userId: string, filters: { origin?: string; path?: string }) {
    const whereClause: any = { userId };
    if (filters.origin) {
      whereClause.origin = filters.origin;
    }
    if (filters.path) {
      whereClause.path = filters.path;
    }

    const walkthroughs = await Walkthrough.findAll({
      where: whereClause,
      include: [
        {
          model: WalkthroughStep,
          as: 'steps',
        },
      ],
      order: [
        ['createdAt', 'DESC'],
        [{ model: WalkthroughStep, as: 'steps' }, 'stepNumber', 'ASC'],
      ],
    });

    return walkthroughs;
  }

  static async getWalkthroughById(userId: string, id: string) {
    const walkthrough = await Walkthrough.findByPk(id, {
      include: [
        {
          model: WalkthroughStep,
          as: 'steps',
        },
      ],
      order: [[{ model: WalkthroughStep, as: 'steps' }, 'stepNumber', 'ASC']],
    });

    if (!walkthrough) {
      throw {
        status: 404,
        message: 'Walkthrough not found',
      };
    }

    if (walkthrough.userId !== userId) {
      throw {
        status: 403,
        message: 'Forbidden: You do not own this walkthrough',
      };
    }

    return walkthrough;
  }

  static async updateWalkthrough(userId: string, id: string, data: {
    name?: string;
    origin?: string;
    path?: string;
    steps?: any[];
    isActive?: boolean;
  }) {
    const t = await sequelize.transaction();
    try {
      const walkthrough = await Walkthrough.findByPk(id, { transaction: t });

      if (!walkthrough) {
        throw {
          status: 404,
          message: 'Walkthrough not found',
        };
      }

      if (walkthrough.userId !== userId) {
        throw {
          status: 403,
          message: 'Forbidden: You do not own this walkthrough',
        };
      }

      const { name, origin, path, steps, isActive } = data;

      if (name !== undefined) walkthrough.name = name;
      if (origin !== undefined) walkthrough.origin = origin;
      if (path !== undefined) walkthrough.path = path;
      if (isActive !== undefined) walkthrough.isActive = isActive;

      await walkthrough.save({ transaction: t });

      if (steps !== undefined) {
        await WalkthroughStep.destroy({
          where: { walkthroughId: id },
          transaction: t,
        });

        const stepsToCreate = steps.map((step: any) => ({
          walkthroughId: id,
          stepNumber: step.stepNumber,
          title: step.title,
          description: step.description,
          selectors: step.selectors,
          triggerType: step.triggerType,
          triggerValue: step.triggerValue,
          path: step.path,
        }));

        await WalkthroughStep.bulkCreate(stepsToCreate, { transaction: t });
      }

      await t.commit();

      const result = await Walkthrough.findByPk(id, {
        include: [{ model: WalkthroughStep, as: 'steps' }],
        order: [[{ model: WalkthroughStep, as: 'steps' }, 'stepNumber', 'ASC']],
      });

      return result;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  static async deleteWalkthrough(userId: string, id: string) {
    const walkthrough = await Walkthrough.findByPk(id);

    if (!walkthrough) {
      throw {
        status: 404,
        message: 'Walkthrough not found',
      };
    }

    if (walkthrough.userId !== userId) {
      throw {
        status: 403,
        message: 'Forbidden: You do not own this walkthrough',
      };
    }

    await walkthrough.destroy();
    return true;
  }
}
