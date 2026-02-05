'use strict';

const { Category, Product } = require('../models');
const { Op } = require('sequelize');


const createCategory = async (req, res) => {
  try {
    const { name, slug, description, parentId, imageUrl, metadata, isActive } = req.body;

    // Vérifier si le slug existe déjà
    const existingCategory = await Category.findOne({ where: { slug } });
    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: 'Une catégorie avec ce slug existe déjà'
      });
    }

    // Si parentId est fourni, vérifier qu'il existe
    if (parentId) {
      const parentCategory = await Category.findByPk(parentId);
      if (!parentCategory) {
        return res.status(404).json({
          success: false,
          message: 'Catégorie parente introuvable'
        });
      }
    }

    const category = await Category.create({
      name,
      slug,
      description,
      parentId,
      imageUrl,
      metadata: metadata || {},
      isActive: isActive !== undefined ? isActive : true
    });

    return res.status(201).json({
      success: true,
      message: 'Catégorie créée avec succès',
      data: category
    });

  } catch (error) {
    console.error('Erreur lors de la création de la catégorie:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création de la catégorie',
      error: error.message
    });
  }
};

const getAllCategories = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      parentId,
      includeSubcategories = 'true'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = {};

    // Filtre par recherche (name)
    if (search) {
      whereClause.name = { [Op.like]: `%${search}%` };
    }

    // Filtre par statut actif
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    // Filtre par catégorie parente
    if (parentId !== undefined) {
      whereClause.parentId = parentId === 'null' ? null : parentId;
    }

    const include = [];
    
    // Inclure les sous-catégories si demandé
    if (includeSubcategories === 'true') {
      include.push({
        model: Category,
        as: 'subcategories',
        attributes: ['id', 'name', 'slug', 'imageUrl', 'isActive']
      });
    }

    // Inclure la catégorie parente
    include.push({
      model: Category,
      as: 'parent',
      attributes: ['id', 'name', 'slug']
    });

    const { count, rows: categories } = await Category.findAndCountAll({
      where: whereClause,
      include,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
      distinct: true
    });

    return res.status(200).json({
      success: true,
      message: 'Catégories récupérées avec succès',
      data: {
        categories,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des catégories',
      error: error.message
    });
  }
};

const getCategoryTree = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { parentId: null, isActive: true },
      include: [{
        model: Category,
        as: 'subcategories',
        where: { isActive: true },
        required: false,
        include: [{
          model: Category,
          as: 'subcategories',
          where: { isActive: true },
          required: false
        }]
      }],
      order: [
        ['metadata', 'ASC'], // Trie par metadata.order si défini
        ['name', 'ASC']
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Arbre des catégories récupéré avec succès',
      data: categories
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de l\'arbre des catégories:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération de l\'arbre',
      error: error.message
    });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id, {
      include: [
        {
          model: Category,
          as: 'subcategories',
          attributes: ['id', 'name', 'slug', 'imageUrl', 'isActive']
        },
        {
          model: Category,
          as: 'parent',
          attributes: ['id', 'name', 'slug']
        }
      ]
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Catégorie introuvable'
      });
    }

    // Compter le nombre de produits dans cette catégorie
    const productCount = await Product.count({
      where: { categoryId: id }
    });

    return res.status(200).json({
      success: true,
      message: 'Catégorie récupérée avec succès',
      data: {
        ...category.toJSON(),
        productCount
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de la catégorie:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération de la catégorie',
      error: error.message
    });
  }
};
const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({
      where: { slug },
      include: [
        {
          model: Category,
          as: 'subcategories',
          where: { isActive: true },
          required: false
        },
        {
          model: Category,
          as: 'parent',
          attributes: ['id', 'name', 'slug']
        }
      ]
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Catégorie introuvable'
      });
    }

    const productCount = await Product.count({
      where: { categoryId: category.id }
    });

    return res.status(200).json({
      success: true,
      message: 'Catégorie récupérée avec succès',
      data: {
        ...category.toJSON(),
        productCount
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de la catégorie:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, parentId, imageUrl, metadata, isActive } = req.body;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Catégorie introuvable'
      });
    }

    // Vérifier si le nouveau slug existe déjà (sauf pour cette catégorie)
    if (slug && slug !== category.slug) {
      const existingCategory = await Category.findOne({ where: { slug } });
      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message: 'Une catégorie avec ce slug existe déjà'
        });
      }
    }

    // Si parentId est modifié, vérifier qu'il existe et éviter les boucles
    if (parentId && parentId !== category.parentId) {
      // Empêcher qu'une catégorie soit son propre parent
      if (parentId === id) {
        return res.status(400).json({
          success: false,
          message: 'Une catégorie ne peut pas être son propre parent'
        });
      }

      const parentCategory = await Category.findByPk(parentId);
      if (!parentCategory) {
        return res.status(404).json({
          success: false,
          message: 'Catégorie parente introuvable'
        });
      }

      // Empêcher les boucles : vérifier que le nouveau parent n'est pas un enfant
      if (parentCategory.parentId === id) {
        return res.status(400).json({
          success: false,
          message: 'Création de boucle interdite : le parent ne peut pas être un enfant de cette catégorie'
        });
      }
    }

    await category.update({
      name: name || category.name,
      slug: slug || category.slug,
      description: description !== undefined ? description : category.description,
      parentId: parentId !== undefined ? parentId : category.parentId,
      imageUrl: imageUrl !== undefined ? imageUrl : category.imageUrl,
      metadata: metadata !== undefined ? metadata : category.metadata,
      isActive: isActive !== undefined ? isActive : category.isActive
    });

    return res.status(200).json({
      success: true,
      message: 'Catégorie mise à jour avec succès',
      data: category
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de la catégorie:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour',
      error: error.message
    });
  }
};
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Catégorie introuvable'
      });
    }

    // Vérifier s'il y a des produits associés
    const productCount = await Product.count({
      where: { categoryId: id }
    });

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Impossible de supprimer cette catégorie. Elle contient ${productCount} produit(s)`
      });
    }

    // Vérifier s'il y a des sous-catégories
    const subcategoryCount = await Category.count({
      where: { parentId: id }
    });

    if (subcategoryCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Impossible de supprimer cette catégorie. Elle contient ${subcategoryCount} sous-catégorie(s)`
      });
    }

    await category.destroy();

    return res.status(200).json({
      success: true,
      message: 'Catégorie supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression de la catégorie:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suppression',
      error: error.message
    });
  }
};

// Exports
module.exports = {
  createCategory,
  getAllCategories,
  getCategoryTree,
  getCategoryById,
  getCategoryBySlug,
  updateCategory,
  deleteCategory
};