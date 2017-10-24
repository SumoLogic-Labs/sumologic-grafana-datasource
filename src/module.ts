import SumoLogicMetricsDatasource from './datasource';
import SumoLogicMetricsQueryCtrl from './query_ctrl';

class SumoLogicMetricsConfigCtrl {
  static templateUrl = 'partials/config.html';
}

// class SumoLogicMetricsAnnotationsQueryCtrl {
//   static templateUrl = 'partials/annotations.editor.html';
// }

export {
  SumoLogicMetricsDatasource as Datasource,
  SumoLogicMetricsConfigCtrl as ConfigCtrl,
  SumoLogicMetricsQueryCtrl as QueryCtrl,
}