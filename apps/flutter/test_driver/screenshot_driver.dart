// 页面截图巡检的宿主端驱动。
//
// 这里只负责把测试连到 Flutter driver 协议上；截图本身由宿主机脚本
// 监听测试输出的 SHOT 信号行后，用 simctl 抓取模拟器画面完成。
import 'package:integration_test/integration_test_driver.dart';

Future<void> main() async {
  await integrationDriver();
}
