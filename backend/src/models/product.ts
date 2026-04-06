import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface ProductAttributes {
    id: string;
    integration_account_id: string;
    organization_id: string;
    asin: string;
    sku: string | null;
    title: string | null;
    image_url: string | null;
    is_top_product: boolean;
    track_buybox: boolean;
    estimated_daily_units: number | null;
    average_selling_price: number | null;
    last_synced_at: Date | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface ProductCreationAttributes extends Optional<ProductAttributes, 'id' | 'sku' | 'title' | 'image_url' | 'is_top_product' | 'track_buybox' | 'estimated_daily_units' | 'average_selling_price' | 'last_synced_at' | 'created_at' | 'updated_at' | 'deleted_at'> {}

class Product extends Model<ProductAttributes, ProductCreationAttributes> implements ProductAttributes {
    declare id: string;
    declare integration_account_id: string;
    declare organization_id: string;
    declare asin: string;
    declare sku: string | null;
    declare title: string | null;
    declare image_url: string | null;
    declare is_top_product: boolean;
    declare track_buybox: boolean;
    declare estimated_daily_units: number | null;
    declare average_selling_price: number | null;
    declare last_synced_at: Date | null;
    declare created_at: Date;
    declare updated_at: Date;
    declare deleted_at: Date | null;
}

Product.init(
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
        asin: {
            type: DataTypes.STRING(20),
            allowNull: false,
        },
        sku: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        title: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        image_url: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        is_top_product: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        track_buybox: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        estimated_daily_units: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        average_selling_price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        last_synced_at: {
            type: DataTypes.DATE,
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
        tableName: 'products',
        paranoid: true,
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
    }
);

export default Product;
