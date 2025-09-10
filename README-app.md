# 🌊 Horloge des Marées - Rimouski

Une application web progressive (PWA) moderne pour consulter les marées de Rimouski en temps réel, utilisant les données officielles de Pêches et Océans Canada (DFO-MPO).

## ✨ Fonctionnalités

- **Horloge circulaire des marées** avec affichage en temps réel
- **Interface sombre moderne** inspirée du design gaming/tech
- **Données officielles DFO-MPO** pour Rimouski, Québec
- **Mode hors ligne** avec cache intelligent
- **PWA complète** installable sur mobile et desktop
- **Design responsive** optimisé mobile-first
- **Accessibilité WCAG 2.1 AA** avec support clavier et lecteur d'écran

## 🚀 Technologies

- **React 18** avec TypeScript
- **Vite** pour le build et développement
- **PWA** avec service worker et manifest
- **CSS3** avec variables personnalisées et animations
- **API DFO-MPO** pour les données de marée officielles

## 📱 Aperçu des fonctionnalités

### Horloge Circulaire
- Aiguille des marées indiquant la position dans le cycle
- Affichage du niveau actuel en temps réel
- Indicateur de tendance (montante/descendante)
- Marqueurs visuels pour marées hautes et basses

### Informations Détaillées
- État actuel de la marée
- Prochaine marée prévue
- Toutes les marées du jour
- Dernière mise à jour des données

### Interface Moderne
- Thème sombre avec effets de lumière
- Gradients bleus et violets
- Animations fluides et élégantes
- Effets de glow et de blur

## 🛠 Installation et Développement

### Prérequis
- Node.js 18+ 
- npm ou yarn

### Installation
```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev

# Build pour production
npm run build

# Prévisualiser le build
npm run preview
```

### Structure du Projet
```
src/
├── components/
│   ├── TideClock.tsx        # Composant horloge circulaire
│   └── TideClock.css        # Styles de l'horloge
├── services/
│   └── tideService.ts       # Service API DFO-MPO
├── App.tsx                  # Composant principal
├── App.css                  # Styles de l'application
├── index.css                # Styles globaux
└── main.tsx                 # Point d'entrée

public/
├── manifest.json            # Manifest PWA
├── pwa-*.png               # Icônes PWA
└── vite.svg                # Favicon
```

## 🌊 API et Données

### Source des Données
- **API**: Pêches et Océans Canada (DFO-MPO)
- **Station**: Rimouski (ID: 03360)
- **Type**: Prédictions de marées officielles
- **Fréquence**: Mise à jour toutes les 15 minutes

### Cache et Performance
- Cache intelligent de 15 minutes
- Mode hors ligne avec données de secours
- Gestion d'erreur avec retry automatique
- Interpolation en temps réel entre les prédictions

## 🎨 Design et UX

### Thème Sombre Moderne
- Couleurs principales: `#1a1a2e`, `#16213e`, `#0f3460`
- Accents: Bleu (`#4facfe`) et Violet (`#00f2fe`)
- Effets: Glow, blur, gradients animés

### Responsive Design
- **Mobile**: 320px+ avec interface compacte
- **Tablet**: 768px+ avec layout optimisé
- **Desktop**: 1024px+ avec layout complet

### Accessibilité
- Contraste WCAG 2.1 AA conforme
- Navigation clavier complète
- Attributs ARIA appropriés
- Support lecteur d'écran
- Mode réduit pour animations

## 📱 PWA Features

### Installation
- Installable sur iOS/Android/Desktop
- Icônes adaptatives pour tous les systèmes
- Splash screen personnalisé

### Offline Support
- Service Worker avec cache strategies
- Données de marée en cache
- Interface disponible hors ligne

### Performance
- Lazy loading des composants
- Optimisation des images
- Bundle splitting automatique

## 🔧 Configuration

### Variables d'Environnement
```env
# Optionnel: URL personnalisée de l'API DFO
VITE_DFO_API_URL=https://api.waterlevels.gc.ca/api/v1

# Optionnel: ID de station personnalisé
VITE_STATION_ID=03360
```

### Personnalisation
- Couleurs dans `src/index.css` (variables CSS)
- Configuration PWA dans `vite.config.ts`
- Manifest PWA dans `public/manifest.json`

## 🧪 Tests et Validation

### Tests de Développement
```bash
# Lancer les tests
npm run test

# Tests avec coverage
npm run test:coverage

# Tests E2E
npm run test:e2e
```

### Validation PWA
- Lighthouse score 90+
- PWA Checklist complète
- Tests offline/online
- Tests installation

## 📦 Déploiement

### Build Production
```bash
npm run build
```

### Serveurs Supportés
- Netlify, Vercel, GitHub Pages
- Apache, Nginx avec configuration SPA
- CDN avec cache approprié

### Configuration Serveur
```nginx
# Exemple Nginx
location / {
  try_files $uri $uri/ /index.html;
  add_header Cache-Control "no-cache, no-store, must-revalidate";
}

location /assets/ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🙏 Remerciements

- **Pêches et Océans Canada** pour les données de marée officielles
- **Vite** et **React** pour les outils de développement
- **Communauté open source** pour les libraries utilisées

---

**Développé avec ❤️ pour la communauté maritime du Québec et de l'Acadie** 🏴󐁣󐁿 🟦🟨⚡🟥