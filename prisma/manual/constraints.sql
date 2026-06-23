-- ─────────────────────────────────────────────────────────────
-- Contraintes d'intégrité métier (CHECK) — Smart-Yield
-- Prisma ne sait pas exprimer les CHECK dans le schéma : on les pose ici.
-- À exécuter une fois, après `npm run prisma:migrate`, sur la base MariaDB :
--   mysql -u <user> -p <db> < prisma/manual/constraints.sql
-- (MariaDB 10.2+ applique réellement les CHECK.)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE `sources_energie`
  ADD CONSTRAINT chk_source_cout CHECK (`coutProduction` >= 0);

ALTER TABLE `stocks_energie`
  ADD CONSTRAINT chk_stock_qte CHECK (`quantite` >= 0);

ALTER TABLE `achats_energie`
  ADD CONSTRAINT chk_achat_qte   CHECK (`quantite` > 0),
  ADD CONSTRAINT chk_achat_prix  CHECK (`prixAchat` >= 0),
  ADD CONSTRAINT chk_achat_total CHECK (`total` >= 0);

ALTER TABLE `ventes_energie`
  ADD CONSTRAINT chk_vente_qte   CHECK (`quantite` > 0),
  ADD CONSTRAINT chk_vente_prix  CHECK (`prixVente` >= 0),
  ADD CONSTRAINT chk_vente_total CHECK (`total` >= 0);

ALTER TABLE `seuils_energie`
  ADD CONSTRAINT chk_seuil_decl  CHECK (`seuilDeclenchement` >= 0),
  ADD CONSTRAINT chk_seuil_arret CHECK (`seuilArret` >= 0);

ALTER TABLE `sessions_energie`
  ADD CONSTRAINT chk_sess_prevue   CHECK (`quantitePrevue` >= 0),
  ADD CONSTRAINT chk_sess_produite CHECK (`quantiteProduite` >= 0),
  ADD CONSTRAINT chk_sess_cout     CHECK (`coutTotal` >= 0);
