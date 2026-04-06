import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface ScanAttributes {
    id: string;
    integration_account_id: string;
    organization_id: string;
    triggered_by: string;
    status: string;
    marketplace: string;
    total_products: number;
    scanned_products: number;
    issues_found: number;
    started_at: Date | null;
    completed_at: Date | null;
    error_message: string | null;
    job_id: string | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface ScanCreationAttributes extends Optional<ScanAttributes, 'id' | 'status' | 'marketplace' | 'total_products' | 'scanned_products' | 'issues_found' | 'started_at' | 'completed_at' | 'error_message' | 'job_id' | 'created_at' | 'updated_at' | 'deleted_at'> {}

class Scan extends Model<ScanAttributes, ScanCreationAttributes> implements ScanAttributes {
    declare id: string;
    declare integration_account_id: string;
    declare organization_id: string;
    declare triggered_by: string;
    declare status: string;
    declare marketplace: string;
    declare total_products: number;
    declare scanned_products: number;
    declare issues_found: number;
    declare started_at: Date | null;
    declare completed_at: Date | null;
    declare error_message: string | null;
    declare job_id: string | null;
    declare created_at: Date;
    declare updated_at: Date;
    declare deleted_at: Date | null;
}

Scan.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        integration_account_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        organization_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        triggered_by: {
            type: DataTypes.STRING(20),
            allowNull: false,
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'queued',
        },
        marketplace: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: 'US',
        },
        total_products: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        scanned_products: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        issues_found: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        started_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        completed_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        error_message: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        job_id: {
            type: DataTypes.STRING(100),
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
        deleted_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'scans',
        paranoid: true,
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
    }
);

export default Scan;
