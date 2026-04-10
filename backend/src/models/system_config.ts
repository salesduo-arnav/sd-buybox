import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface SystemConfigAttributes {
    id: string;
    config_key: string;
    config_value: unknown;
    config_type: string;
    category: string;
    description: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface SystemConfigCreationAttributes extends Optional<SystemConfigAttributes, 'id' | 'config_type' | 'category' | 'description' | 'created_at' | 'updated_at'> {}

class SystemConfig extends Model<SystemConfigAttributes, SystemConfigCreationAttributes> implements SystemConfigAttributes {
    declare id: string;
    declare config_key: string;
    declare config_value: unknown;
    declare config_type: string;
    declare category: string;
    declare description: string | null;
    declare created_at: Date;
    declare updated_at: Date;
}

SystemConfig.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        config_key: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
        },
        config_value: {
            type: DataTypes.JSONB,
            allowNull: false,
        },
        config_type: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'text',
        },
        category: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'general',
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'system_configs',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);

export default SystemConfig;
