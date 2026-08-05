<?php

namespace Tests\Feature;

use App\Http\Controllers\SettingsController;
use App\Models\Setting;
use Tests\TestCase;

class SettingsControllerTest extends TestCase
{
    public function test_index_exposes_medical_folder_module_flag_disabled_by_default(): void
    {
        Setting::query()->where('key', 'module_clinical_observations_enabled')->delete();

        $response = (new SettingsController())->index();
        $data = $response->getData(true);

        $this->assertArrayHasKey('module_clinical_observations_enabled', $data);
        $this->assertFalse($data['module_clinical_observations_enabled']);
    }
}
