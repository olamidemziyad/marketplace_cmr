module.exports = function authorize(...allowRoles){
    return(req, res, next) => {
        try {
            const user = req.user;

            
            if(!user){
                return res.status(401).json({message : "L'utilisateur est introuvable ou n'existe pas !"});
            }

            if(!allowRoles.includes(user.role)){
                return res.status(403).json({message : "Access refusé : role non autorisé" });
            }

            next();

        } catch(err) {
            console.error(err);
            return res
            .status(500)
            .json({erreur : err.message});
        }
    }
}