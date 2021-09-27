const requireAll = r => r.keys().forEach(r);

import './index.scss';
import './components';

// Include all component js files
requireAll(require.context('./components', true, /\.js$/));
