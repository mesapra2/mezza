import static com.kms.katalon.core.checkpoint.CheckpointFactory.findCheckpoint
import static com.kms.katalon.core.testcase.TestCaseFactory.findTestCase
import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject
import static com.kms.katalon.core.testobject.ObjectRepository.findWindowsObject
import com.kms.katalon.core.checkpoint.Checkpoint as Checkpoint
import com.kms.katalon.core.cucumber.keyword.CucumberBuiltinKeywords as CucumberKW
import com.kms.katalon.core.mobile.keyword.MobileBuiltInKeywords as Mobile
import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testcase.TestCase as TestCase
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.testng.keyword.TestNGBuiltinKeywords as TestNGKW
import com.kms.katalon.core.testobject.TestObject as TestObject
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.windows.keyword.WindowsBuiltinKeywords as Windows
import internal.GlobalVariable as GlobalVariable
import org.openqa.selenium.Keys as Keys

WebUI.openBrowser('')

WebUI.navigateToUrl('https://app.mesapra2.com/')

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Login - Mesapra2/button_Ou continue com_inline-flex items-ce_b0fe5b'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Fazer login nas Contas do Google/div_Fazer Login com o Google_S7xv8 LZgQXe'))

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Login - Mesapra2/input_Email_email'), 'admin@mesapra2.com')

WebUI.setEncryptedText(findTestObject('Object Repository/mesatestes/Page_Login - Mesapra2/input_Senha_password'), 'JupXO1n0gx32R6OCHMHjgA==')

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Login - Mesapra2/button_Senha_inline-flex items-center justi_677702'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Dashboard  Mesapra2/a_Dashboard_flex items-center px-3 py-2 tex_fc9ac5'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Eventos - Mesapra2/svg_Criar Evento_w-5 h-5 mr-2'))

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/input_Ttulo do Evento_title'), 'evento pra testar tudo ')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description'), 
    'Q')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_1'), 
    'Qu')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_2'), 
    'Que')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_3'), 
    'Quer')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_4'), 
    'Quero')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_5'), 
    'Quero ')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_6'), 
    'Quero v')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_7'), 
    'Quero vs')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_8'), 
    'Quero vsa')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_7'), 
    'Quero vs')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_6'), 
    'Quero v')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_5'), 
    'Quero ')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_9'), 
    'Quero s')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_10'), 
    'Quero sa')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_11'), 
    'Quero sai')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_12'), 
    'Quero sair')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_13'), 
    'Quero saire')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_14'), 
    'Quero saire ')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_15'), 
    'Quero saire  ')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_16'), 
    'Quero saire  a')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_17'), 
    'Quero saire  ap')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_18'), 
    'Quero saire  apg')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_19'), 
    'Quero saire  apga')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_20'), 
    'Quero saire  apgar')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_21'), 
    'Quero saire  apgar ')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_22'), 
    'Quero saire  apgar u')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_23'), 
    'Quero saire  apgar um')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_24'), 
    'Quero saire  apgar uma')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_25'), 
    'Quero saire  apgar uma ')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_26'), 
    'Quero saire  apgar uma v')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_25'), 
    'Quero saire  apgar uma ')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_27'), 
    'Quero saire  apgar uma c')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_28'), 
    'Quero saire  apgar uma ce')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_29'), 
    'Quero saire  apgar uma cer')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_30'), 
    'Quero saire  apgar uma cerv')

WebUI.setText(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/textarea_Descrio_description_31'), 
    'Quero saire  apgar uma cerva')

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/div_Hashtags Comuns_flex flex-wrap gap-2'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/button_vegetariano_px-3 py-2 rounded-lg tex_93a837'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/button_churrasco_px-3 py-2 rounded-lg text-_dbd324'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/button_vegano_px-3 py-2 rounded-lg text-sm _a1302f'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/button_drinks_px-3 py-2 rounded-lg text-sm _3017da'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/button_saudavel_px-3 py-2 rounded-lg text-s_6477b7'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/button_japonesa_px-3 py-2 rounded-lg text-s_0db39c'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/button_sushi_px-3 py-2 rounded-lg text-sm f_febe59'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/button_hamburguer_px-3 py-2 rounded-lg text_699e6a'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/button_pizza_px-3 py-2 rounded-lg text-sm f_8e5bc8'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/div_Hashtags Comuns_flex flex-wrap gap-2'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/button_happyhour_px-3 py-2 rounded-lg text-_2b804c'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/div_Chicago Prime_flex items-center gap-2 mb-1'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/div_Atualizar_glass-effect rounded-lg p-4 b_187dcd'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/div_Cinemark_flex items-start gap-2 text-wh_c594e2'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/p_Cinemark_text-white50 text-xs mb-2'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/input_Nmero de Vagas_acceptedTerms'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Criar Evento - Mesapra2/button_Polticas de Cancelamento_inline-flex_2ac128'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Meus Eventos - Mesapra2/button_Aberto_inline-flex items-center just_a93f12'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Meus Eventos - Mesapra2/a_Restaurantes_flex items-center px-3 py-2 _809843'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Mesapra2/button_M1xel Resende_flex-1 px-4 py-2 bg-pu_a0c34f'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Mesapra2/a_Dashboard_flex items-center px-3 py-2 tex_fc9ac5'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Eventos - Mesapra2/h3_Confirmado_text-lg font-semibold text-wh_b78cbd'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Rodada de chopp no libanus - Mesapra2/a_Restaurantes_flex items-center px-3 py-2 _809843'))

WebUI.click(findTestObject('Object Repository/mesatestes/Page_Mesapra2/a_Mesapra2_flex items-center px-3 py-2 text_add56d'))

