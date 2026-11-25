import 'package:flutter_test/flutter_test.dart';
import 'package:donavida_app/main.dart';

void main() {
  testWidgets('DonavidaApp smoke test', (WidgetTester tester) async {
    // Construir la aplicación y renderizar el primer frame
    await tester.pumpWidget(const DonavidaApp());

    // Verificar que la app carga
    expect(find.byType(DonavidaApp), findsOneWidget);

    // Permitir que el temporizador del SplashScreen avance
    await tester.pumpAndSettle(const Duration(seconds: 3));
  });
}
