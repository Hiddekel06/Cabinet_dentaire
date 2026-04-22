Par defaut ma console des que je lance mon projet affiche cela
Access to XMLHttpRequest at 'https://api.matlabulshifah.com/api/user' from origin 'https://matlabulshifah.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.Understand this error
index-CnnVyJWp.js:14 Erreur de vérification auth: AxiosError: Network Error
    at g.onerror (index-CnnVyJWp.js:11:6216)
    at ql.request (index-CnnVyJWp.js:13:2094)
    at async S (index-CnnVyJWp.js:14:12722)
S @ index-CnnVyJWp.js:14
await in S
(anonymous) @ index-CnnVyJWp.js:14
xn @ index-CnnVyJWp.js:8
Em @ index-CnnVyJWp.js:8
oa @ index-CnnVyJWp.js:8
Em @ index-CnnVyJWp.js:8
oa @ index-CnnVyJWp.js:8
Em @ index-CnnVyJWp.js:8
oa @ index-CnnVyJWp.js:8
Em @ index-CnnVyJWp.js:8
oa @ index-CnnVyJWp.js:8
Em @ index-CnnVyJWp.js:8
oa @ index-CnnVyJWp.js:8
Em @ index-CnnVyJWp.js:8
oa @ index-CnnVyJWp.js:8
Em @ index-CnnVyJWp.js:8
Wm @ index-CnnVyJWp.js:8
(anonymous) @ index-CnnVyJWp.js:8
de @ index-CnnVyJWp.js:1Understand this error
index-CnnVyJWp.js:11  GET https://api.matlabulshifah.com/api/user net::ERR_FAILED 500 (Internal Server Error)


ce que je vois dans laravel log en prod
#4 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Database/Connectors/ConnectionFactory.
php(186): Illuminate\\Database\\Connectors\\MySqlConnector->connect(Array)                                      
#5 [internal function]: Illuminate\\Database\\Connectors\\ConnectionFactory->Illuminate\\Database\\Connectors\\{
closure}()                                                                                                      
#6 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Database/Connection.php(1257): call_us
er_func(Object(Closure))                                                                                        
#7 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Database/Connection.php(1295): Illumin
ate\\Database\\Connection->getPdo()                                                                             
#8 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Database/Connection.php(525): Illumina
te\\Database\\Connection->getReadPdo()                                                                          
#9 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Database/Connection.php(420): Illumina
te\\Database\\Connection->getPdoForSelect(true)                                                                 
#10 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Database/Connection.php(827): Illumin
ate\\Database\\Connection->Illuminate\\Database\\{closure}('select exists (...', Array)                         
#11 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Database/Connection.php(999): Illumin
ate\\Database\\Connection->runQueryCallback('select exists (...', Array, Object(Closure))                       
#12 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Database/Connection.php(978): Illumin
ate\\Database\\Connection->tryAgainIfCausedByLostConnection(Object(Illuminate\\Database\\QueryException), 'selec
t exists (...', Array, Object(Closure))                                                                         
#13 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Database/Connection.php(796): Illumin
ate\\Database\\Connection->handleQueryException(Object(Illuminate\\Database\\QueryException), 'select exists (..
.', Array, Object(Closure))                                                                                     
#14 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Database/Connection.php(411): Illumin
ate\\Database\\Connection->run('select exists (...', Array, Object(Closure))                                    
#15 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Database/Connection.php(357): Illumin
ate\\Database\\Connection->select('select exists (...', Array, true)                                            
#16 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Database/Connection.php(374): Illumin
ate\\Database\\Connection->selectOne('select exists (...', Array, true)                                         
#17 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Database/Schema/Builder.php(176): Ill
uminate\\Database\\Connection->scalar('select exists (...')                                                     
#18 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Database/Migrations/DatabaseMigration
Repository.php(185): Illuminate\\Database\\Schema\\Builder->hasTable('migrations')                              
#19 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Database/Migrations/Migrator.php(758)
: Illuminate\\Database\\Migrations\\DatabaseMigrationRepository->repositoryExists()                             
#20 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Database/Console/Migrations/MigrateCo
mmand.php(164): Illuminate\\Database\\Migrations\\Migrator->repositoryExists()                                  
#21 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Support/helpers.php(328): Illuminate\
\Database\\Console\\Migrations\\MigrateCommand->Illuminate\\Database\\Console\\Migrations\\{closure}(1)         
#22 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Database/Console/Migrations/MigrateCo
mmand.php(164): retry(1, Object(Closure), 0, Object(Closure))                                                   
#23 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Database/Console/Migrations/MigrateCo
mmand.php(140): Illuminate\\Database\\Console\\Migrations\\MigrateCommand->repositoryExists()                   
#24 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Database/Console/Migrations/MigrateCo
mmand.php(110): Illuminate\\Database\\Console\\Migrations\\MigrateCommand->prepareDatabase()                    
#25 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Database/Migrations/Migrator.php(671)
: Illuminate\\Database\\Console\\Migrations\\MigrateCommand->Illuminate\\Database\\Console\\Migrations\\{closure
}()                                                                                                             
#26 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Database/Console/Migrations/MigrateCo
mmand.php(109): Illuminate\\Database\\Migrations\\Migrator->usingConnection(NULL, Object(Closure))              
#27 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Database/Console/Migrations/MigrateCo
mmand.php(88): Illuminate\\Database\\Console\\Migrations\\MigrateCommand->runMigrations()                       
#28 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(36): Illumi
nate\\Database\\Console\\Migrations\\MigrateCommand->handle()                                                   
#29 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Container/Util.php(43): Illuminate\\C
ontainer\\BoundMethod::Illuminate\\Container\\{closure}()                                                       
#30 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(96): Illumi
nate\\Container\\Util::unwrapIfClosure(Object(Closure))                                                         
#31 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(35): Illumi
nate\\Container\\BoundMethod::callBoundMethod(Object(Illuminate\\Foundation\\Application), Array, Object(Closure
))                                                                                                              
#32 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Container/Container.php(799): Illumin
ate\\Container\\BoundMethod::call(Object(Illuminate\\Foundation\\Application), Array, Array, NULL)              
#33 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Console/Command.php(211): Illuminate\
\Container\\Container->call(Array)                                                                              
#34 /htdocs/api.matlabulshifah.com/vendor/symfony/console/Command/Command.php(341): Illuminate\\Console\\Command
->execute(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate\\Console\\OutputStyle))      
#35 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Console/Command.php(180): Symfony\\Co
mponent\\Console\\Command\\Command->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Illuminate
\\Console\\OutputStyle))                                                                                        
#36 /htdocs/api.matlabulshifah.com/vendor/symfony/console/Application.php(1117): Illuminate\\Console\\Command->r
un(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOut
put))                                                                                                           
#37 /htdocs/api.matlabulshifah.com/vendor/symfony/console/Application.php(356): Symfony\\Component\\Console\\App
lication->doRunCommand(Object(Illuminate\\Database\\Console\\Migrations\\MigrateCommand), Object(Symfony\\Compon
ent\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Output\\ConsoleOutput))                    
#38 /htdocs/api.matlabulshifah.com/vendor/symfony/console/Application.php(195): Symfony\\Component\\Console\\App
lication->doRun(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfony\\Component\\Console\\Outpu
t\\ConsoleOutput))                                                                                              
#39 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Foundation/Console/Kernel.php(198): S
ymfony\\Component\\Console\\Application->run(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfo
ny\\Component\\Console\\Output\\ConsoleOutput))                                                                 
#40 /htdocs/api.matlabulshifah.com/vendor/laravel/framework/src/Illuminate/Foundation/Application.php(1235): Ill
uminate\\Foundation\\Console\\Kernel->handle(Object(Symfony\\Component\\Console\\Input\\ArgvInput), Object(Symfo
ny\\Component\\Console\\Output\\ConsoleOutput))                                                                 
#41 /htdocs/api.matlabulshifah.com/artisan(16): Illuminate\\Foundation\\Application->handleCommand(Object(Symfon
y\\Component\\Console\\Input\\ArgvInput))                                                                       
#42 {main}                                                                                                      
"}                                                                                                              
matla2778711@webdb88:~/htdocs/api.matlabulshifah.com$           