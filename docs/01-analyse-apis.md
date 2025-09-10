# Analyse des APIs de Données pour l'Horloge des Marées

## APIs de Données de Marées

### 1. Pêches et Océans Canada (MPO/DFO)
**URL**: https://api-iwls.dfo-mpo.gc.ca/
- **Statut**: API officielle gouvernementale canadienne
- **Couverture**: Toutes les stations de marée canadiennes, incluant Rimouski
- **Données**: Prédictions de marées, observations en temps réel, niveaux d'eau
- **Format**: JSON/XML
- **Coût**: Gratuit
- **Limitations**: Rate limiting standard
- **Documentation**: https://iwls-snmm.dfo-mpo.gc.ca/

### 2. NOAA Tides & Currents API
**URL**: https://api.tidesandcurrents.noaa.gov/api/prod/
- **Statut**: API américaine, données limitées pour le Canada
- **Couverture**: Principalement États-Unis, quelques stations canadiennes
- **Données**: Marées, courants, niveaux d'eau, météo marine
- **Format**: JSON/XML/CSV
- **Coût**: Gratuit
- **Documentation**: https://api.tidesandcurrents.noaa.gov/api/prod/

### 3. WorldTides API
**URL**: https://www.worldtides.info/api
- **Statut**: Service commercial global
- **Couverture**: Mondiale, incluant Rimouski
- **Données**: Prédictions de marées, hauteurs, extremes
- **Format**: JSON
- **Coût**: Freemium (1000 requêtes/mois gratuit)
- **Avantages**: Simple à utiliser, fiable

## APIs Météo Marine

### 1. Environnement et Changement Climatique Canada
**URL**: https://api.weather.gc.ca/
- **Statut**: API officielle gouvernementale
- **Couverture**: Toutes les stations météo canadiennes
- **Données**: Conditions actuelles, prévisions, alertes marines
- **Format**: JSON/XML
- **Coût**: Gratuit
- **Spécificité**: Données marines spécialisées pour le Saint-Laurent

### 2. OpenWeatherMap Marine API
**URL**: https://openweathermap.org/api/marine
- **Statut**: Service commercial
- **Couverture**: Mondiale
- **Données**: Vagues, température de l'eau, visibilité
- **Format**: JSON
- **Coût**: Freemium (1000 requêtes/jour gratuit)

## APIs Astronomiques

### 1. Sunrise-Sunset API
**URL**: https://sunrise-sunset.org/api
- **Statut**: Service gratuit
- **Données**: Lever/coucher du soleil, crépuscules
- **Format**: JSON
- **Coût**: Gratuit

### 2. Moon API (farmsense.net)
**URL**: https://api.farmsense.net/v1/moonphases/
- **Statut**: Service gratuit
- **Données**: Phases lunaires, illumination
- **Format**: JSON
- **Coût**: Gratuit

### 3. IPGEOLOCATION Astronomy API
**URL**: https://ipgeolocation.io/astronomy-api.html
- **Données**: Position soleil/lune, phases lunaires, marées astronomiques
- **Format**: JSON
- **Coût**: Freemium (1000 requêtes/mois)

## Recommandations pour Rimouski

### API Principale Recommandée: DFO-MPO Canada
```
Station Rimouski: 
- ID: 03370 (Port de Rimouski)
- Coordonnées: 48.4667°N, 68.5333°W
- Fuseau horaire: America/Toronto (UTC-5/-4)
```

### Configuration Multi-Sources
1. **Marées**: DFO-MPO (primaire) + WorldTides (backup)
2. **Météo**: Environment Canada (primaire) + OpenWeatherMap (backup)
3. **Astronomie**: Combinaison Sunrise-Sunset + Moon API

## Structure de Données Unified

```json
{
  "location": {
    "name": "Rimouski, QC",
    "coordinates": [48.4667, -68.5333],
    "timezone": "America/Toronto",
    "station_id": "03370"
  },
  "tides": {
    "current": {
      "height": 2.45,
      "trend": "rising",
      "next_high": "2024-01-15T14:32:00-05:00",
      "next_low": "2024-01-15T20:15:00-05:00"
    },
    "predictions": []
  },
  "weather": {
    "marine": {
      "wave_height": 0.8,
      "wind_speed": 15,
      "wind_direction": 230,
      "water_temperature": 4.2
    }
  },
  "astronomy": {
    "sun": {
      "sunrise": "2024-01-15T07:45:00-05:00",
      "sunset": "2024-01-15T16:30:00-05:00"
    },
    "moon": {
      "phase": "waxing_gibbous",
      "illumination": 0.73
    }
  }
}
```

## Contraintes et Limitations

### Rate Limiting
- DFO-MPO: 1000 requêtes/heure
- WorldTides: 1000 requêtes/mois (gratuit)
- Environment Canada: Limite non spécifiée

### Stratégie de Cache
- **Prédictions de marées**: Cache 24h (données stables)
- **Conditions actuelles**: Cache 15 min
- **Météo**: Cache 1h
- **Astronomie**: Cache 24h

### Gestion Hors-ligne
- Pré-charger 7 jours de prédictions
- Cache local avec IndexedDB
- Fallback sur données calculées (approximations)

## Sécurité et Clés API

### Gestion des Clés
```javascript
// Utilisation de variables d'environnement
const API_KEYS = {
  WORLDTIDES: process.env.REACT_APP_WORLDTIDES_KEY,
  OPENWEATHER: process.env.REACT_APP_OPENWEATHER_KEY,
  IPGEOLOCATION: process.env.REACT_APP_IPGEO_KEY
};
```

### Proxy API Recommandé
Pour éviter l'exposition des clés côté client, utiliser un backend simple (Vercel Functions ou Netlify Functions) comme proxy.