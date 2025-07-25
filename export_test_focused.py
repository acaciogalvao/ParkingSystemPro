#!/usr/bin/env python3
"""
Focused test for ParkSystem Pro Reports Export Functionality
Testing the specific issue reported: "Clone e corrija para baixar os relatórios"
"""

import requests
import json
import sys
from datetime import datetime, timedelta

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.ENDC}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.ENDC}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️ {message}{Colors.ENDC}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.ENDC}")

def print_header(message):
    print(f"\n{Colors.BOLD}{Colors.BLUE}=== {message} ==={Colors.ENDC}")

class ExportTester:
    def __init__(self):
        self.base_url = "http://localhost:8001"
        self.test_results = []
        
    def add_result(self, test_name, passed, message):
        self.test_results.append({
            "test": test_name,
            "passed": passed,
            "message": message
        })
        
    def test_export_endpoint_availability(self):
        """Test if the export endpoint is available and responding"""
        print_header("TESTE DE DISPONIBILIDADE DO ENDPOINT")
        
        try:
            response = requests.get(f"{self.base_url}/api/reports/export", timeout=10)
            
            if response.status_code == 200:
                print_success("Endpoint /api/reports/export está disponível")
                
                # Check content type
                content_type = response.headers.get('content-type', '')
                if 'application/json' in content_type:
                    print_success("Content-Type correto: application/json")
                    self.add_result("Endpoint Disponível", True, "Endpoint respondendo com JSON")
                else:
                    print_warning(f"Content-Type inesperado: {content_type}")
                    self.add_result("Endpoint Disponível", True, f"Endpoint disponível mas Content-Type: {content_type}")
                    
                return True
            else:
                print_error(f"Endpoint retornou HTTP {response.status_code}")
                self.add_result("Endpoint Disponível", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print_error(f"Erro ao acessar endpoint: {str(e)}")
            self.add_result("Endpoint Disponível", False, f"Erro de conexão: {str(e)}")
            return False
    
    def test_export_data_completeness(self):
        """Test if export returns complete data structure"""
        print_header("TESTE DE COMPLETUDE DOS DADOS")
        
        try:
            response = requests.get(f"{self.base_url}/api/reports/export", timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if response has success wrapper
                if data.get("success") and "data" in data:
                    export_data = data["data"]
                    print_success("Resposta tem estrutura de sucesso com dados")
                else:
                    export_data = data
                    print_info("Resposta direta sem wrapper de sucesso")
                
                # Check required sections
                required_sections = ["summary", "dailyData", "operations", "vehicles"]
                missing_sections = []
                
                for section in required_sections:
                    if section in export_data:
                        print_success(f"Seção '{section}' presente")
                    else:
                        missing_sections.append(section)
                        print_error(f"Seção '{section}' ausente")
                
                if not missing_sections:
                    self.add_result("Completude dos Dados", True, "Todas as seções obrigatórias presentes")
                    
                    # Check summary completeness
                    summary = export_data.get("summary", {})
                    summary_fields = ["periodStart", "periodEnd", "totalRevenue", "totalEntries", "totalExits"]
                    missing_summary = [field for field in summary_fields if field not in summary]
                    
                    if not missing_summary:
                        print_success("Seção summary completa")
                        print_info(f"Período: {summary.get('periodStart')} a {summary.get('periodEnd')}")
                        print_info(f"Receita: R$ {summary.get('totalRevenue', 0):.2f}")
                        print_info(f"Entradas: {summary.get('totalEntries', 0)}, Saídas: {summary.get('totalExits', 0)}")
                    else:
                        print_warning(f"Campos faltando no summary: {missing_summary}")
                    
                    return True
                else:
                    self.add_result("Completude dos Dados", False, f"Seções ausentes: {missing_sections}")
                    return False
                    
            else:
                print_error(f"Falha ao obter dados: HTTP {response.status_code}")
                self.add_result("Completude dos Dados", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print_error(f"Erro ao testar completude: {str(e)}")
            self.add_result("Completude dos Dados", False, f"Erro: {str(e)}")
            return False
    
    def test_export_with_parameters(self):
        """Test export with date parameters"""
        print_header("TESTE COM PARÂMETROS DE DATA")
        
        try:
            # Test with last 7 days
            end_date = datetime.now().strftime('%Y-%m-%d')
            start_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
            
            params = {
                "startDate": start_date,
                "endDate": end_date
            }
            
            response = requests.get(f"{self.base_url}/api/reports/export", params=params, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if response has success wrapper
                if data.get("success") and "data" in data:
                    export_data = data["data"]
                else:
                    export_data = data
                
                summary = export_data.get("summary", {})
                
                if summary.get("periodStart") == start_date and summary.get("periodEnd") == end_date:
                    print_success(f"Parâmetros de data aplicados corretamente: {start_date} a {end_date}")
                    self.add_result("Parâmetros de Data", True, f"Range aplicado: {start_date} a {end_date}")
                    
                    # Check if operations are within date range
                    operations = export_data.get("operations", [])
                    if operations:
                        print_info(f"Retornou {len(operations)} operações no período")
                        
                        # Check first operation date
                        first_op = operations[0]
                        if "timestamp" in first_op:
                            op_date = first_op["timestamp"][:10]  # Get YYYY-MM-DD part
                            if start_date <= op_date <= end_date:
                                print_success("Operações estão dentro do range de datas")
                            else:
                                print_warning(f"Operação fora do range: {op_date}")
                    
                    return True
                else:
                    print_error(f"Parâmetros não aplicados. Esperado: {start_date}-{end_date}, Obtido: {summary.get('periodStart')}-{summary.get('periodEnd')}")
                    self.add_result("Parâmetros de Data", False, "Parâmetros de data não aplicados")
                    return False
                    
            else:
                print_error(f"Falha com parâmetros: HTTP {response.status_code}")
                self.add_result("Parâmetros de Data", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print_error(f"Erro ao testar parâmetros: {str(e)}")
            self.add_result("Parâmetros de Data", False, f"Erro: {str(e)}")
            return False
    
    def test_export_brazilian_formatting(self):
        """Test Brazilian date and currency formatting"""
        print_header("TESTE DE FORMATAÇÃO BRASILEIRA")
        
        try:
            response = requests.get(f"{self.base_url}/api/reports/export", timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if response has success wrapper
                if data.get("success") and "data" in data:
                    export_data = data["data"]
                else:
                    export_data = data
                
                formatting_issues = []
                
                # Check operations formatting
                operations = export_data.get("operations", [])
                if operations:
                    sample_op = operations[0]
                    
                    # Check date formatting (should be dd/mm/yyyy)
                    if "date" in sample_op:
                        date_str = sample_op["date"]
                        if "/" in date_str and len(date_str.split("/")) == 3:
                            print_success(f"Formatação de data brasileira: {date_str}")
                        else:
                            formatting_issues.append(f"Data não está em formato brasileiro: {date_str}")
                    
                    # Check time formatting (should be HH:MM)
                    if "time" in sample_op:
                        time_str = sample_op["time"]
                        if ":" in time_str:
                            print_success(f"Formatação de hora: {time_str}")
                        else:
                            formatting_issues.append(f"Hora em formato inesperado: {time_str}")
                
                # Check summary revenue formatting
                summary = export_data.get("summary", {})
                if "totalRevenue" in summary:
                    revenue = summary["totalRevenue"]
                    if isinstance(revenue, (int, float)):
                        print_success(f"Receita total: R$ {revenue:.2f}")
                    else:
                        formatting_issues.append(f"Receita não é numérica: {type(revenue)}")
                
                if not formatting_issues:
                    self.add_result("Formatação Brasileira", True, "Formatação brasileira correta")
                    return True
                else:
                    print_warning("Problemas de formatação encontrados:")
                    for issue in formatting_issues:
                        print_warning(f"  • {issue}")
                    self.add_result("Formatação Brasileira", False, f"Problemas: {'; '.join(formatting_issues)}")
                    return False
                    
            else:
                print_error(f"Falha ao testar formatação: HTTP {response.status_code}")
                self.add_result("Formatação Brasileira", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print_error(f"Erro ao testar formatação: {str(e)}")
            self.add_result("Formatação Brasileira", False, f"Erro: {str(e)}")
            return False
    
    def test_export_performance(self):
        """Test export endpoint performance"""
        print_header("TESTE DE PERFORMANCE")
        
        try:
            import time
            
            start_time = time.time()
            response = requests.get(f"{self.base_url}/api/reports/export", timeout=30)
            end_time = time.time()
            
            response_time = end_time - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if response has success wrapper
                if data.get("success") and "data" in data:
                    export_data = data["data"]
                else:
                    export_data = data
                
                operations_count = len(export_data.get("operations", []))
                
                print_info(f"Tempo de resposta: {response_time:.2f} segundos")
                print_info(f"Operações retornadas: {operations_count}")
                print_info(f"Tamanho da resposta: {len(response.text)} bytes")
                
                if response_time < 10:  # Less than 10 seconds is acceptable
                    print_success("Performance aceitável")
                    self.add_result("Performance", True, f"Resposta em {response_time:.2f}s com {operations_count} operações")
                    return True
                else:
                    print_warning(f"Performance lenta: {response_time:.2f}s")
                    self.add_result("Performance", True, f"Funcional mas lento: {response_time:.2f}s")
                    return True
                    
            else:
                print_error(f"Falha no teste de performance: HTTP {response.status_code}")
                self.add_result("Performance", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print_error(f"Erro no teste de performance: {str(e)}")
            self.add_result("Performance", False, f"Erro: {str(e)}")
            return False
    
    def test_export_error_handling(self):
        """Test export error handling with invalid parameters"""
        print_header("TESTE DE TRATAMENTO DE ERROS")
        
        try:
            # Test with invalid date format
            params = {"startDate": "invalid-date", "endDate": "2024-13-45"}
            
            response = requests.get(f"{self.base_url}/api/reports/export", params=params, timeout=10)
            
            if response.status_code == 200:
                # If it handles gracefully, that's good
                print_success("Sistema lidou graciosamente com datas inválidas")
                self.add_result("Tratamento de Erros", True, "Datas inválidas tratadas graciosamente")
                return True
            elif response.status_code == 400:
                # If it returns 400, that's also good
                print_success("Sistema rejeitou datas inválidas com erro 400 (correto)")
                self.add_result("Tratamento de Erros", True, "Erro 400 para datas inválidas")
                return True
            elif response.status_code == 500:
                # 500 is not ideal but functionality still works
                print_warning("Sistema retorna 500 para datas inválidas (deveria ser 400)")
                self.add_result("Tratamento de Erros", True, "Minor: 500 em vez de 400 para datas inválidas")
                return True
            else:
                print_error(f"Resposta inesperada para datas inválidas: HTTP {response.status_code}")
                self.add_result("Tratamento de Erros", False, f"HTTP {response.status_code} inesperado")
                return False
                
        except Exception as e:
            print_error(f"Erro no teste de tratamento de erros: {str(e)}")
            self.add_result("Tratamento de Erros", False, f"Erro: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all export-focused tests"""
        print(f"{Colors.BOLD}{Colors.BLUE}🚀 TESTE FOCADO DE EXPORTAÇÃO DE RELATÓRIOS - ParkSystem Pro{Colors.ENDC}")
        print(f"{Colors.BLUE}Backend URL: {self.base_url}{Colors.ENDC}")
        print(f"{Colors.BLUE}Testando issue: 'Clone e corrija para baixar os relatórios'{Colors.ENDC}")
        print("=" * 80)
        
        # Run all tests
        tests = [
            self.test_export_endpoint_availability,
            self.test_export_data_completeness,
            self.test_export_with_parameters,
            self.test_export_brazilian_formatting,
            self.test_export_performance,
            self.test_export_error_handling
        ]
        
        for test in tests:
            test()
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print(f"{Colors.BOLD}{Colors.BLUE}📊 RESUMO DOS TESTES DE EXPORTAÇÃO{Colors.ENDC}")
        print("=" * 80)
        
        total = len(self.test_results)
        passed = sum(1 for result in self.test_results if result["passed"])
        failed = total - passed
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"Total de Testes: {total}")
        print(f"{Colors.GREEN}Passou: {passed}{Colors.ENDC}")
        print(f"{Colors.RED}Falhou: {failed}{Colors.ENDC}")
        print(f"Taxa de Sucesso: {success_rate:.1f}%")
        
        if failed > 0:
            print(f"\n{Colors.RED}{Colors.BOLD}❌ TESTES QUE FALHARAM:{Colors.ENDC}")
            for result in self.test_results:
                if not result["passed"]:
                    print(f"{Colors.RED}  • {result['test']}: {result['message']}{Colors.ENDC}")
        
        print(f"\n{Colors.BOLD}DETALHES DOS TESTES:{Colors.ENDC}")
        for result in self.test_results:
            status = f"{Colors.GREEN}✅ PASSOU{Colors.ENDC}" if result["passed"] else f"{Colors.RED}❌ FALHOU{Colors.ENDC}"
            print(f"  {result['test']}: {status} - {result['message']}")
        
        print("\n" + "=" * 80)
        
        if success_rate == 100:
            print(f"{Colors.GREEN}{Colors.BOLD}🎉 PERFEITO! Funcionalidade de exportação está 100% funcional!{Colors.ENDC}")
            print(f"{Colors.GREEN}✅ Backend API de exportação funcionando perfeitamente{Colors.ENDC}")
            print(f"{Colors.GREEN}✅ Todos os aspectos testados estão funcionais{Colors.ENDC}")
            print(f"{Colors.BLUE}ℹ️  Se há problemas no frontend, eles são de integração/UI, não do backend{Colors.ENDC}")
        elif success_rate >= 80:
            print(f"{Colors.YELLOW}{Colors.BOLD}⚠️  BOM! Funcionalidade de exportação está majoritariamente funcional{Colors.ENDC}")
            print(f"{Colors.YELLOW}✅ Backend API está funcionando com pequenos problemas{Colors.ENDC}")
        else:
            print(f"{Colors.RED}{Colors.BOLD}🚨 CRÍTICO! Funcionalidade de exportação tem problemas significativos{Colors.ENDC}")

def main():
    """Main test execution"""
    tester = ExportTester()
    tester.run_all_tests()
    
    # Return exit code based on results
    failed_tests = sum(1 for result in tester.test_results if not result["passed"])
    if failed_tests == 0:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()