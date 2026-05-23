<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Carbon\Carbon;

class CleanupTempFiles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:cleanup-temp-files';

    /**
     * The description of the console command.
     *
     * @var string
     */
    protected $description = 'Supprime les fichiers PDF temporaires de plus de 24 heures pour libérer de l\'espace disque.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $directories = [
            storage_path('app/mpdf'),
            storage_path('framework/cache'),
            storage_path('framework/views'),
        ];

        $count = 0;
        $now = Carbon::now();

        foreach ($directories as $directory) {
            if (!File::exists($directory)) {
                continue;
            }

            $files = File::files($directory);

            foreach ($files as $file) {
                // On ne touche pas aux fichiers .gitignore
                if ($file->getFilename() === '.gitignore') {
                    continue;
                }

                $lastModified = Carbon::createFromTimestamp($file->getMTime());

                // Si le fichier a plus de 24 heures, on le supprime
                if ($lastModified->diffInHours($now) >= 24) {
                    File::delete($file->getPathname());
                    $count++;
                }
            }
        }

        $this->info("Nettoyage terminé : {$count} fichiers temporaires supprimés.");
    }
}
